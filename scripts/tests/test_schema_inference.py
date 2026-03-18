
import json
import pytest
from unittest.mock import patch, MagicMock

import schema_inference as si


SAMPLE_SCHEMA = {
    "required_fields": ["instruction", "input", "output", "domain", "direction"],
    "valid_domains": ["medical", "legal"],
    "valid_directions": ["en_to_es", "es_to_en"],
    "total_records": 5000,
    "null_counts": {"input": 0, "output": 0},
    "input_len_stats": {"mean": 15.2, "max": 180, "min": 3},
}


class TestInferSchema:

    @patch.object(si, "json")
    @patch("builtins.open")
    @patch.object(si, "os")
    def test_loads_schema_from_reports(self, mock_os, mock_open_fn, mock_json):
        mock_json.load.return_value = SAMPLE_SCHEMA
        mock_open_fn.return_value = MagicMock()

        si.infer_schema()

        mock_open_fn.assert_called_with("/opt/airflow/reports/schema.json")
        mock_json.load.assert_called_once()

    @patch.object(si, "json")
    @patch("builtins.open")
    @patch.object(si, "os")
    def test_creates_reports_directory(self, mock_os, mock_open_fn, mock_json):
        mock_json.load.return_value = SAMPLE_SCHEMA
        mock_open_fn.return_value = MagicMock()

        si.infer_schema()

        mock_os.makedirs.assert_called_once_with("/opt/airflow/reports", exist_ok=True)

    @patch.object(si, "json")
    @patch("builtins.open")
    @patch.object(si, "os")
    def test_handles_missing_schema_file(self, mock_os, mock_open_fn, mock_json):
        mock_open_fn.side_effect = FileNotFoundError("schema.json not found")

        with pytest.raises(FileNotFoundError):
            si.infer_schema()