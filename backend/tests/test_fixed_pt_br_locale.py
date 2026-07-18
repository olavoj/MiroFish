from app.services.zep_tools import AgentInterview, ZepToolsService
from app.utils.locale import get_language_instruction, get_locale, set_locale


class RecordingLLM:
    def __init__(self):
        self.messages = None

    def chat_json(self, *, messages, **kwargs):
        self.messages = messages
        return {"questions": ["Como esse evento afetou você?"]}

    def chat(self, *, messages, **kwargs):
        self.messages = messages
        return "Resumo da entrevista"


def make_service(llm):
    service = ZepToolsService.__new__(ZepToolsService)
    service._llm_client = llm
    return service


def test_default_locale_is_pt_br():
    set_locale("en")
    assert get_locale() == "pt-BR"


def test_language_instruction_preserves_technical_contracts():
    instruction = get_language_instruction()
    assert "português do Brasil" in instruction
    assert "JSON" in instruction
    assert "identificadores técnicos" in instruction


def test_interview_questions_prompt_requires_pt_br_instruction():
    llm = RecordingLLM()
    service = make_service(llm)

    questions = service._generate_interview_questions(
        interview_requirement="Entender os impactos do evento",
        simulation_requirement="Uma simulação local",
        selected_agents=[{"profession": "jornalista"}],
    )

    assert questions == ["Como esse evento afetou você?"]
    system_prompt = llm.messages[0]["content"]
    assert get_language_instruction() in system_prompt
    assert "português do Brasil" in system_prompt
    assert "entrevistador" in system_prompt
    assert "记者" not in system_prompt


def test_interview_summary_prompt_requires_pt_br_instruction_and_literal_quotes():
    llm = RecordingLLM()
    service = make_service(llm)
    literal_quote = 'A fonte disse: "este trecho deve permanecer literal".'

    summary = service._generate_interview_summary(
        interviews=[
            AgentInterview(
                agent_name="Ana",
                agent_role="moradora",
                agent_bio="",
                question="O que aconteceu?",
                response=literal_quote,
            )
        ],
        interview_requirement="Reunir perspectivas locais",
    )

    assert summary == "Resumo da entrevista"
    system_prompt = llm.messages[0]["content"]
    user_prompt = llm.messages[1]["content"]
    assert get_language_instruction() in system_prompt
    assert "português do Brasil" in system_prompt
    assert "citar literalmente" in system_prompt
    assert literal_quote in user_prompt
    assert "新闻编辑" not in system_prompt
