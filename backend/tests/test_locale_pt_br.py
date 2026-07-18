import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


INTERPOLATION_PATTERN = re.compile(r"\{[^{}]+\}")
HTML_TAG_OR_SLOT_PATTERN = re.compile(r"</?[^<>]+?>")


def assert_catalog_structure_matches(english, portuguese, path="root"):
    assert type(portuguese) is type(english), (
        f"type mismatch at {path}: "
        f"{type(english).__name__} != {type(portuguese).__name__}"
    )

    if isinstance(english, dict):
        assert set(portuguese) == set(english), f"key mismatch at {path}"
        for key in english:
            assert_catalog_structure_matches(
                english[key], portuguese[key], f"{path}.{key}"
            )
        return

    if isinstance(english, list):
        assert len(portuguese) == len(english), f"array length mismatch at {path}"
        for index, item in enumerate(english):
            assert_catalog_structure_matches(
                item, portuguese[index], f"{path}[{index}]"
            )
        return

    if isinstance(english, str):
        assert Counter(INTERPOLATION_PATTERN.findall(portuguese)) == Counter(
            INTERPOLATION_PATTERN.findall(english)
        ), f"interpolation mismatch at {path}"
        assert HTML_TAG_OR_SLOT_PATTERN.findall(portuguese) == (
            HTML_TAG_OR_SLOT_PATTERN.findall(english)
        ), f"HTML tag/slot mismatch at {path}"


def test_pt_br_catalog_matches_english_structure_and_tokens():
    english = json.loads((ROOT / "locales/en.json").read_text(encoding="utf-8"))
    portuguese = json.loads((ROOT / "locales/pt-BR.json").read_text(encoding="utf-8"))
    assert_catalog_structure_matches(english, portuguese)


def test_pt_br_language_instruction_is_explicit():
    languages = json.loads((ROOT / "locales/languages.json").read_text(encoding="utf-8"))
    assert languages["pt-BR"]["label"] == "Português (Brasil)"
    instruction = languages["pt-BR"]["llmInstruction"]
    assert "português do Brasil" in instruction
    assert "trechos literais" in instruction
    assert "JSON" in instruction
    assert "identificadores técnicos" in instruction
