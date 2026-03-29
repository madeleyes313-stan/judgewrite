from __future__ import annotations

import asyncio
import sys
import tempfile
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from starlette.datastructures import UploadFile


ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from apps.api.app.routers import cases as cases_router  # noqa: E402
from apps.api.app.services.archive_store import ArchiveStore  # noqa: E402
from apps.api.app.services.session_store import SessionStore  # noqa: E402


class ReviewPersistenceTest(unittest.TestCase):
    def test_generated_review_can_be_saved_and_reloaded(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            session_store = SessionStore(temp_path / "runtime_cases.json")
            archive_store = ArchiveStore(temp_path / "archive_cases.json")

            with patch.object(cases_router, "store", session_store), patch.object(
                cases_router, "archive_store", archive_store
            ), patch.object(cases_router.time, "sleep", lambda _: None):
                upload_payload = asyncio.run(
                    cases_router.upload_case(
                        files=[
                            UploadFile(
                                filename="起诉状.txt",
                                file=BytesIO("原告张某诉称被告李某拖欠借款10万元，请求依法判令偿还本金及利息。".encode("utf-8")),
                            ),
                            UploadFile(
                                filename="答辩状.txt",
                                file=BytesIO("被告李某辩称双方款项属于投资合作，不属于借贷关系。".encode("utf-8")),
                            ),
                        ]
                    )
                )
                case_id = upload_payload["case_id"]

                cases_router._run_extract(case_id)
                extracted_status = cases_router.get_case_status(case_id)
                self.assertEqual(extracted_status["workflow_status"], "extracted")

                cases_router._run_generate(case_id, "judge_zhang")
                generated_status = cases_router.get_case_status(case_id)
                self.assertEqual(generated_status["workflow_status"], "generated")
                self.assertTrue(generated_status["review_state"]["draft"])

                similar_cases = generated_status["generation_result"]["similar_cases"]
                citation_states = {similar_cases[0]["case_id"]: "inserted"} if similar_cases else {}
                issue_states = {"high:金额未校验:请核对本金与利息计算": "resolved"}

                save_response = cases_router.save_archive_review(
                    case_id,
                    cases_router.SaveReviewRequest(
                        draft="人工修订后的裁判文书草稿",
                        issue_states=issue_states,
                        citation_states=citation_states,
                    ),
                )
                saved_payload = save_response
                self.assertEqual(saved_payload["review_state"]["draft"], "人工修订后的裁判文书草稿")
                self.assertEqual(saved_payload["review_state"]["issue_states"], issue_states)
                self.assertEqual(saved_payload["review_state"]["citation_states"], citation_states)

                archive_detail = cases_router.get_archive_case(case_id)
                self.assertEqual(archive_detail["review_state"]["draft"], "人工修订后的裁判文书草稿")

                archive_items = cases_router.list_archive()
                saved_item = next(item for item in archive_items if item.case_id == case_id)
                self.assertEqual(saved_item.status, "已归档")

                reloaded_store = SessionStore(temp_path / "runtime_cases.json")
                reloaded_session = reloaded_store.get(case_id)
                self.assertIsNotNone(reloaded_session.review_state)
                self.assertEqual(reloaded_session.review_state.draft, "人工修订后的裁判文书草稿")
                self.assertEqual(reloaded_session.review_state.issue_states, issue_states)


if __name__ == "__main__":
    unittest.main()
