import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sync import (  # noqa: E402
    build_status,
    is_detail_tag,
    is_noise_tag,
    select_build_tags,
    select_channels,
)


class TagSelectionTest(unittest.TestCase):
    def test_noise_tags_are_signatures_and_attestations(self):
        self.assertTrue(is_noise_tag("sha256-abc.att"))
        self.assertTrue(is_noise_tag("odh-pr-108.sig"))
        self.assertTrue(is_noise_tag("image.sbom"))
        self.assertFalse(is_noise_tag("odh-pr-108"))
        self.assertFalse(is_noise_tag("odh-pr"))

    def test_build_tags_keep_newest_unique_digests(self):
        tags = [
            {
                "name": "odh-pr-108",
                "manifest_digest": "sha256:aaa",
                "last_modified": "Wed, 28 Oct 2026 18:57:08 -0000",
            },
            {
                "name": "odh-pr",
                "manifest_digest": "sha256:aaa",
                "last_modified": "Wed, 28 Oct 2026 18:57:07 -0000",
            },
            {
                "name": "sha256-fff.sig",
                "manifest_digest": "sha256:bbb",
                "last_modified": "Wed, 28 Oct 2026 18:57:09 -0000",
            },
            {
                "name": "odh-pr-107",
                "manifest_digest": "sha256:ccc",
                "last_modified": "Wed, 28 Oct 2026 18:40:00 -0000",
            },
        ]
        chosen = select_build_tags(tags, limit=6)
        self.assertEqual([tag["name"] for tag in chosen], ["odh-pr-108", "odh-pr-107"])

    def test_detail_tags_are_hidden_behind_the_commit_tag(self):
        self.assertTrue(is_detail_tag("odh-pr-linux-m2xlarge-arm64"))
        self.assertTrue(is_detail_tag("odh-openshell-gateway-on-pull-request-mgv5t-build-images-1"))
        self.assertTrue(is_detail_tag("odh-pr.prefetch"))
        self.assertTrue(is_detail_tag("odh-pr.git"))
        tags = [
            {
                "name": "odh-pr",
                "manifest_digest": "sha256:aaa",
                "last_modified": "Wed, 28 Oct 2026 18:57:09 -0000",
            },
            {
                "name": "odh-pr-d943e91fd3996cf999da0ba8e5d2e2d64c213dfc",
                "manifest_digest": "sha256:aaa",
                "last_modified": "Wed, 28 Oct 2026 18:57:08 -0000",
            },
            {
                "name": "odh-pr-linux-m2xlarge-amd64",
                "manifest_digest": "sha256:bbb",
                "last_modified": "Wed, 28 Oct 2026 18:52:56 -0000",
            },
        ]
        chosen = select_build_tags(tags, limit=6)
        self.assertEqual(
            [tag["name"] for tag in chosen],
            ["odh-pr-d943e91fd3996cf999da0ba8e5d2e2d64c213dfc"],
        )

    def test_channels_keep_the_newest_pointer_for_each_name(self):
        tags = [
            {
                "name": "odh-pr",
                "manifest_digest": "sha256:old",
                "last_modified": "Wed, 28 Oct 2026 18:41:21 -0000",
            },
            {
                "name": "odh-pr",
                "manifest_digest": "sha256:new",
                "last_modified": "Wed, 28 Oct 2026 18:56:53 -0000",
            },
            {
                "name": "odh-pr-108",
                "manifest_digest": "sha256:new",
                "last_modified": "Wed, 28 Oct 2026 18:57:08 -0000",
            },
        ]
        channels = select_channels(tags)
        self.assertEqual(len(channels), 1)
        self.assertEqual(channels[0]["manifest_digest"], "sha256:new")


class StatusAssemblyTest(unittest.TestCase):
    def test_build_status_shapes_images_and_missing_workflows(self):
        catalog = {
            "products": [
                {
                    "key": "openshell",
                    "name": "OpenShell",
                    "summary": "Public images and tests.",
                    "source": "https://github.com/opendatahub-io/openshell",
                    "images": [
                        {
                            "name": "Gateway",
                            "repository": "quay.io/opendatahub/odh-openshell-gateway",
                        }
                    ],
                    "workflows": [
                        {"repo": "opendatahub-io/openshell", "name": "Kubernetes E2E Test"},
                        {"repo": "opendatahub-io/openshell", "name": "Missing Workflow"},
                    ],
                }
            ]
        }
        tags = [
            {
                "name": "odh-pr-108",
                "manifest_digest": "sha256:aaa",
                "last_modified": "Wed, 28 Oct 2026 18:57:08 -0000",
            }
        ]
        runs = {
            ("opendatahub-io/openshell", "Kubernetes E2E Test"): {
                "conclusion": "success",
                "status": "completed",
                "head_branch": "main",
                "head_sha": "abc123",
                "updated_at": "2026-10-28T18:26:23Z",
                "html_url": "https://github.com/opendatahub-io/openshell/actions/runs/1",
            },
            ("opendatahub-io/openshell", "Missing Workflow"): None,
        }
        status = build_status(
            catalog,
            {"quay.io/opendatahub/odh-openshell-gateway": tags},
            runs,
            "2026-10-28T19:00:00+00:00",
        )
        image = status["products"][0]["images"][0]
        self.assertEqual(image["builds"][0]["name"], "odh-pr-108")
        self.assertEqual(
            image["registryUrl"],
            "https://quay.io/repository/opendatahub/odh-openshell-gateway",
        )
        workflows = status["products"][0]["workflows"]
        self.assertEqual(workflows[0]["conclusion"], "success")
        self.assertEqual(workflows[0]["branch"], "main")
        self.assertEqual(workflows[1]["status"], "missing")
        self.assertEqual(image["pullTag"], "odh-stable")
        self.assertEqual(status["products"][0]["docs"], [])


if __name__ == "__main__":
    unittest.main()
