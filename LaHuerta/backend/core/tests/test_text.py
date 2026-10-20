from core.text import capitalize_words


def test_capitalize_words_each_word():
    assert capitalize_words('copia de lista de precios mino') == 'Copia De Lista De Precios Mino'


def test_capitalize_words_lowercases_rest_of_word():
    assert capitalize_words('LISTA MAYORISTA') == 'Lista Mayorista'


def test_capitalize_words_trims_and_collapses_spaces():
    assert capitalize_words('  lista   mayo  2026 ') == 'Lista Mayo 2026'


def test_capitalize_words_keeps_accents():
    assert capitalize_words('última lista ñandú') == 'Última Lista Ñandú'


def test_capitalize_words_empty_values():
    assert capitalize_words('') == ''
    assert capitalize_words(None) is None


def test_capitalize_words_company_types():
    assert capitalize_words('comedor iGLESIA San Justo sa') == 'Comedor Iglesia San Justo S.A.'
    assert capitalize_words('kona srl') == 'Kona S.R.L.'
    assert capitalize_words('empresa SAS') == 'Empresa S.A.S.'


def test_capitalize_words_company_types_with_dots_and_case():
    assert capitalize_words('clöe s.a') == 'Clöe S.A.'
    assert capitalize_words('clöe S.A.') == 'Clöe S.A.'
    assert capitalize_words('migogus S.r.l.') == 'Migogus S.R.L.'


def test_capitalize_words_company_type_only_as_whole_word():
    assert capitalize_words('sabores de salta') == 'Sabores De Salta'


def test_capitalize_words_company_types_saci():
    assert capitalize_words('hospital privado modelo SACI') == 'Hospital Privado Modelo S.A.C.I.'
    assert capitalize_words('molinos S.A.C.I.F.') == 'Molinos S.A.C.I.F.'
