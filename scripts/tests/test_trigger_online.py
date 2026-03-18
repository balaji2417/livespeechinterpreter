import json
import pytest
from unittest.mock import patch, MagicMock

import trigger_online as to


SAMPLE_APPROVAL = {
    "approved": True,
    "timestamp": "2026-03-18 12:00:00",
    "train_records": 20000,
    "val_records": 2500,
    "test_records": 2500,
    "version": "v2_approved",
}


class TestTriggerOnlinePipeline:

    @patch.object(to, "json")
    @patch("builtins.open")
    def test_creates_trigger_payload(self, mock_open_fn, mock_json):
        mock_json.load.return_value = SAMPLE_APPROVAL
        mock_json.dump = MagicMock()
        mock_json.dumps = json.dumps

        to.trigger_online_pipeline()

        payload = mock_json.dump.call_args[0][0]
        assert "gcs_train" in payload
        assert "gcs_val" in payload
        assert "gcs_schema" in payload
        assert payload["dataset_version"] == "v2_approved"
        assert payload["train_records"] == 20000

    @patch.object(to, "json")
    @patch("builtins.open")
    def test_gcs_paths_use_correct_prefix(self, mock_open_fn, mock_json):
        mock_json.load.return_value = SAMPLE_APPROVAL
        mock_json.dump = MagicMock()
        mock_json.dumps = json.dumps

        to.trigger_online_pipeline()

        payload = mock_json.dump.call_args[0][0]
        assert payload["gcs_train"].startswith("gs://")
        assert "v2_approved" in payload["gcs_train"]
        assert payload["gcs_val"].startswith("gs://")

    @patch.object(to, "json")
    @patch("builtins.open")
    def test_reads_approval_file(self, mock_open_fn, mock_json):
        mock_json.load.return_value = SAMPLE_APPROVAL
        mock_json.dump = MagicMock()
        mock_json.dumps = json.dumps

        to.trigger_online_pipeline()

        mock_open_fn.assert_any_call("/opt/airflow/reports/dataset_approval.json")

    @patch.object(to, "json")
    @patch("builtins.open")
    def test_version_from_approval_propagated(self, mock_open_fn, mock_json):
        custom_approval = SAMPLE_APPROVAL.copy()
        custom_approval["version"] = "v3_custom"
        mock_json.load.return_value = custom_approval
        mock_json.dump = MagicMock()
        mock_json.dumps = json.dumps

        to.trigger_online_pipeline()

        payload = mock_json.dump.call_args[0][0]
        assert payload["dataset_version"] == "v3_custom"

    @patch.object(to, "json")
    @patch("builtins.open")
    def test_raises_when_approval_missing(self, mock_open_fn, mock_json):
        mock_open_fn.side_effect = FileNotFoundError("approval file not found")

        with pytest.raises(FileNotFoundError):
            to.trigger_online_pipeline()