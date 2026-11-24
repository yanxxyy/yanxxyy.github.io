"""Run with: python -m unittest agent/test_agent.py"""

import json
import os
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
import server  # noqa: E402


class MockDeepSeek(BaseHTTPRequestHandler):
    received = None

    def do_POST(self):
        self.__class__.received = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        body = json.dumps({"choices": [{"message": {"content": "Lumi 项目包含工作流编排与素材生成服务链路。"}}]}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class AgentTests(unittest.TestCase):
    def test_resume_retrieval(self):
        self.assertIn("国家奖学金", server.INDEX.search("国奖是什么")[0].text)
        self.assertEqual(server.INDEX.search("今天天气怎么样"), [])
        self.assertEqual(server.INDEX.search("论文发表在哪里")[0].section, "科研经历")

    def test_deepseek_request_and_sources(self):
        upstream = ThreadingHTTPServer(("127.0.0.1", 0), MockDeepSeek)
        api = ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        threads = [threading.Thread(target=instance.serve_forever, daemon=True) for instance in (upstream, api)]
        for thread in threads:
            thread.start()
        try:
            with patch.dict(os.environ, {"DEEPSEEK_API_KEY": "test-key"}), patch.object(server, "DEEPSEEK_URL", f"http://127.0.0.1:{upstream.server_port}/chat"):
                request = Request(
                    f"http://127.0.0.1:{api.server_port}/api/chat",
                    data=json.dumps({"question": "Lumi 项目做了什么？", "history": []}).encode(),
                    headers={"Content-Type": "application/json", "Origin": "https://yanxxyy.github.io"},
                    method="POST",
                )
                with urlopen(request) as response:
                    result = json.load(response)
                    self.assertEqual(response.headers["Access-Control-Allow-Origin"], "https://yanxxyy.github.io")
                self.assertIn("Lumi", result["answer"])
                self.assertTrue(any(source["url"].endswith("#experience") for source in result["sources"]))
                self.assertIn("Lumi", MockDeepSeek.received["messages"][1]["content"])

                blocked = Request(
                    f"http://127.0.0.1:{api.server_port}/api/chat",
                    data=b'{"question":"hi"}',
                    headers={"Content-Type": "application/json", "Origin": "https://example.org"},
                    method="POST",
                )
                with self.assertRaises(HTTPError) as error:
                    urlopen(blocked)
                self.assertEqual(error.exception.code, 403)
        finally:
            api.shutdown()
            upstream.shutdown()
            api.server_close()
            upstream.server_close()


if __name__ == "__main__":
    unittest.main()
