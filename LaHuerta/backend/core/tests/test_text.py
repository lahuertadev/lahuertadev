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
