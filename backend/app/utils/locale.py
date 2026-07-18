import json
import os
import threading

_thread_local = threading.local()
FIXED_LOCALE = 'pt-BR'

_locales_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'locales')

# Load language registry
with open(os.path.join(_locales_dir, 'languages.json'), 'r', encoding='utf-8') as f:
    _languages = json.load(f)

# Load translation files
_translations = {}
for filename in os.listdir(_locales_dir):
    if filename.endswith('.json') and filename != 'languages.json':
        locale_name = filename[:-5]
        with open(os.path.join(_locales_dir, filename), 'r', encoding='utf-8') as f:
            _translations[locale_name] = json.load(f)


def set_locale(locale: str):
    """Keep the fixed Brazilian Portuguese locale in background threads."""
    _thread_local.locale = FIXED_LOCALE


def get_locale() -> str:
    return FIXED_LOCALE


def t(key: str, **kwargs) -> str:
    messages = _translations.get(FIXED_LOCALE, {})

    value = messages
    for part in key.split('.'):
        if isinstance(value, dict):
            value = value.get(part)
        else:
            value = None
            break

    if value is None:
        value = _translations.get(FIXED_LOCALE, {})
        for part in key.split('.'):
            if isinstance(value, dict):
                value = value.get(part)
            else:
                value = None
                break

    if value is None:
        return key

    if kwargs:
        for k, v in kwargs.items():
            value = value.replace(f'{{{k}}}', str(v))

    return value


def get_language_instruction() -> str:
    lang_config = _languages.get(FIXED_LOCALE, {})
    return lang_config.get(
        'llmInstruction',
        'Responda sempre em português do Brasil, com linguagem natural e clara. '
        'Preserve nomes de campos JSON, identificadores técnicos e valores enumerados '
        'exigidos pelas APIs.'
    )
