"""Build a small searchable knowledge base from the published resume page."""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path


SITE_URL = "https://yanxxyy.github.io/"
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
WORD_PATTERN = re.compile(r"[\u4e00-\u9fff]+|[a-z0-9]+", re.IGNORECASE)


@dataclass
class Node:
    tag: str
    attrs: dict[str, str] = field(default_factory=dict)
    children: list[Node | str] = field(default_factory=list)

    def has_class(self, name: str) -> bool:
        return name in self.attrs.get("class", "").split()

    def find_all(self, tag: str | None = None, class_name: str | None = None, node_id: str | None = None) -> list[Node]:
        found = []
        if (tag is None or self.tag == tag) and (class_name is None or self.has_class(class_name)) and (node_id is None or self.attrs.get("id") == node_id):
            found.append(self)
        for child in self.children:
            if isinstance(child, Node):
                found.extend(child.find_all(tag, class_name, node_id))
        return found

    def first(self, tag: str | None = None, class_name: str | None = None) -> Node | None:
        return next(iter(self.find_all(tag, class_name)), None)

    def text(self) -> str:
        parts = []
        for child in self.children:
            if isinstance(child, str):
                parts.append(child)
            elif child.tag not in {"script", "style"}:
                parts.append(child.text())
        return " ".join(" ".join(parts).split())


class ResumeParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node("root")
        self.stack = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = Node(tag, {key: value or "" for key, value in attrs})
        self.stack[-1].children.append(node)
        if tag not in VOID_TAGS:
            self.stack.append(node)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag not in VOID_TAGS:
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                return

    def handle_data(self, data: str) -> None:
        if data.strip():
            self.stack[-1].children.append(data)


@dataclass(frozen=True)
class Chunk:
    title: str
    section: str
    url: str
    text: str


def _text(node: Node | None) -> str:
    return node.text() if node else ""


def build_chunks(page_path: Path) -> list[Chunk]:
    parser = ResumeParser()
    parser.feed(page_path.read_text(encoding="utf-8"))
    root = parser.root
    chunks = []

    hero = root.first("section", "hero")
    if hero:
        summary = hero.first(class_name="hero-main")
        contact = hero.first("aside", "contact-card")
        chunks.append(Chunk("个人简介", "首页", SITE_URL, _text(summary)))
        chunks.append(Chunk("联系方式", "首页", SITE_URL, _text(contact)))

    for section_id in ("experience", "projects", "research", "figures", "education", "skills"):
        section = next(iter(root.find_all("section", node_id=section_id)), None)
        if not section:
            continue
        section_title = _text(section.first("h2"))
        url = f"{SITE_URL}#{section_id}"

        if section_id in {"experience", "projects"}:
            for article in section.find_all("article"):
                heading = _text(article.first("h3"))
                intro = " ".join(_text(article.first(class_name=name)) for name in ("entry-top", "project-intro", "stack"))
                detail_list = article.first("dl", "detail-list")
                if not detail_list:
                    continue
                for detail in detail_list.find_all("div"):
                    label = _text(detail.first("dt"))
                    chunks.append(Chunk(f"{heading} · {label}", section_title, url, f"{section_title} {intro} {detail.text()}"))
                metrics = article.first(class_name="metric-row")
                if metrics:
                    chunks.append(Chunk(f"{heading} · 效果评估", section_title, url, f"{section_title} {heading} {_text(metrics)}"))
        elif section_id == "figures":
            for figure in section.find_all("figure", "paper-figure"):
                caption = figure.first("figcaption")
                chunks.append(Chunk(_text(caption.first("h4")) if caption else section_title, section_title, url, f"{section_title} {_text(caption)}"))
        else:
            for article in section.find_all("article"):
                heading = _text(article.first("h3"))
                chunks.append(Chunk(heading or section_title, section_title, url, f"{section_title} {article.text()}"))

    return chunks


def tokenize(value: str) -> list[str]:
    tokens = []
    for match in WORD_PATTERN.finditer(value.lower()):
        word = match.group()
        if "\u4e00" <= word[0] <= "\u9fff":
            if len(word) <= 6:
                tokens.append(word)
            tokens.extend(word[index:index + 2] for index in range(len(word) - 1))
            tokens.extend(word[index:index + 3] for index in range(len(word) - 2))
        else:
            tokens.append(word)
    return tokens


QUERY_HINTS = {
    "国奖": "国家奖学金",
    "研究生": "硕士 华北理工大学",
    "本科": "重庆财经学院",
    "你是谁": "闫星阳 Agent 算法 研发 工程师",
    "自我介绍": "闫星阳 Agent 算法 研发 工程师",
    "联系": "电话 邮箱 联系方式",
}


class ResumeIndex:
    def __init__(self, chunks: list[Chunk]) -> None:
        self.chunks = chunks
        self.documents = [Counter(tokenize(f"{chunk.title} {chunk.text}")) for chunk in chunks]
        self.lengths = [sum(document.values()) for document in self.documents]
        self.average_length = sum(self.lengths) / max(len(self.lengths), 1)
        self.document_frequency = Counter(token for document in self.documents for token in document)

    def search(self, question: str, limit: int = 5) -> list[Chunk]:
        expanded = question + " " + " ".join(hint for trigger, hint in QUERY_HINTS.items() if trigger in question)
        terms = set(tokenize(expanded))
        if not terms:
            return []
        results = []
        for chunk, document, length in zip(self.chunks, self.documents, self.lengths):
            score = 0.0
            for term in terms:
                frequency = document.get(term, 0)
                if not frequency:
                    continue
                document_frequency = self.document_frequency[term]
                idf = math.log1p((len(self.chunks) - document_frequency + .5) / (document_frequency + .5))
                score += idf * frequency * 2.2 / (frequency + 1.2 * (.25 + .75 * length / self.average_length))
            if score > 0:
                results.append((score, chunk))
        results.sort(key=lambda item: item[0], reverse=True)
        return [chunk for _, chunk in results[:limit]]
