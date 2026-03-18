import json
import io
import pytest
from unittest.mock import patch, MagicMock

import split_dataset as sd


def make_records_jsonl(n):
    lines = []
    for i in range(n):
        r = {
            "instruction": "Translate the following medical sentence from English to Spanish.",
            "input": f"Sample sentence number {i} for testing purposes here.",
            "output": f"Oración de ejemplo número {i} para fines de prueba aquí.",
            "domain": "medical",
            "direction": "en_to_es",
        }
        lines.append(json.dumps(r))
    return "\n".join(lines) + "\n"


class TestSplitDataset:

    @patch("builtins.open")
    def test_split_ratios_80_10_10(self, mock_file_open):
        n = 1000
        jsonl_data = make_records_jsonl(n)
        written = {"train": [], "val": [], "test": []}

        def open_side_effect(path, *args, **kwargs):
            if "dataset.jsonl" in path and args == ():
                return MagicMock(__enter__=lambda s: io.StringIO(jsonl_data), __exit__=lambda *a: None)
            for split in ["train", "val", "test"]:
                if f"/{split}.jsonl" in path:
                    mock_writer = MagicMock()
                    mock_writer.write = lambda line, s=split: written[s].append(line)
                    return MagicMock(__enter__=lambda s, mw=mock_writer: mw, __exit__=lambda *a: None)
            return MagicMock(__enter__=lambda s: s, __exit__=lambda *a: None)

        mock_file_open.side_effect = open_side_effect
        sd.split_dataset()

        assert len(written["train"]) == 800
        assert len(written["val"]) == 100
        assert len(written["test"]) == 100

    @patch("builtins.open")
    def test_total_preserved_after_split(self, mock_file_open):
        n = 500
        jsonl_data = make_records_jsonl(n)
        written = {"train": [], "val": [], "test": []}

        def open_side_effect(path, *args, **kwargs):
            if "dataset.jsonl" in path and args == ():
                return MagicMock(__enter__=lambda s: io.StringIO(jsonl_data), __exit__=lambda *a: None)
            for split in ["train", "val", "test"]:
                if f"/{split}.jsonl" in path:
                    mock_writer = MagicMock()
                    mock_writer.write = lambda line, s=split: written[s].append(line)
                    return MagicMock(__enter__=lambda s, mw=mock_writer: mw, __exit__=lambda *a: None)
            return MagicMock(__enter__=lambda s: s, __exit__=lambda *a: None)

        mock_file_open.side_effect = open_side_effect
        sd.split_dataset()

        total_written = sum(len(v) for v in written.values())
        assert total_written == n

    @patch("builtins.open")
    def test_empty_lines_skipped(self, mock_file_open):
        jsonl_data = "\n\n" + make_records_jsonl(10) + "\n\n"
        written = {"train": [], "val": [], "test": []}

        def open_side_effect(path, *args, **kwargs):
            if "dataset.jsonl" in path and args == ():
                return MagicMock(__enter__=lambda s: io.StringIO(jsonl_data), __exit__=lambda *a: None)
            for split in ["train", "val", "test"]:
                if f"/{split}.jsonl" in path:
                    mock_writer = MagicMock()
                    mock_writer.write = lambda line, s=split: written[s].append(line)
                    return MagicMock(__enter__=lambda s, mw=mock_writer: mw, __exit__=lambda *a: None)
            return MagicMock(__enter__=lambda s: s, __exit__=lambda *a: None)

        mock_file_open.side_effect = open_side_effect
        sd.split_dataset()

        total_written = sum(len(v) for v in written.values())
        assert total_written == 10

    @patch("builtins.open")
    def test_shuffle_is_deterministic_with_seed_42(self, mock_file_open):
        n = 100
        jsonl_data = make_records_jsonl(n)
        runs = []

        for _ in range(2):
            written = {"train": [], "val": [], "test": []}

            def open_side_effect(path, *args, **kwargs):
                if "dataset.jsonl" in path and args == ():
                    return MagicMock(__enter__=lambda s: io.StringIO(jsonl_data), __exit__=lambda *a: None)
                for split in ["train", "val", "test"]:
                    if f"/{split}.jsonl" in path:
                        mock_writer = MagicMock()
                        mock_writer.write = lambda line, s=split: written[s].append(line)
                        return MagicMock(__enter__=lambda s, mw=mock_writer: mw, __exit__=lambda *a: None)
                return MagicMock(__enter__=lambda s: s, __exit__=lambda *a: None)

            mock_file_open.side_effect = open_side_effect
            sd.split_dataset()
            runs.append(written["train"][:5])

        assert runs[0] == runs[1]