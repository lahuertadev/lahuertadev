from core.text import capitalize_words, capitalize_address


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


def test_capitalize_words_roman_numerals_uppercase():
    assert capitalize_words('PEREZ RODRIGO Y LABRADOR ROSA MARIA SOCIEDAD CAP I SECC IV') == \
        'Perez Rodrigo Y Labrador Rosa Maria Sociedad Cap I Secc IV'
    assert capitalize_words('colegio juan xxiii') == 'Colegio Juan XXIII'
    assert capitalize_words('etapa ii y iii') == 'Etapa II Y III'


def test_capitalize_words_common_words_are_not_roman():
    assert capitalize_words('mi almacén di mix') == 'Mi Almacén Di Mix'


def test_capitalize_address_abbreviations_get_a_dot():
    assert capitalize_address('AV corrientes 1234') == 'Av. Corrientes 1234'
    assert capitalize_address('av corrientes 1234') == 'Av. Corrientes 1234'
    assert capitalize_address('Av. corrientes 1234') == 'Av. Corrientes 1234'
    assert capitalize_address('gral paz y avda de mayo') == 'Gral. Paz Y Avda. De Mayo'


def test_capitalize_address_symbols_and_initials_without_dot():
    assert capitalize_address('ruta 3 km. 45') == 'Ruta 3 Km 45'
    assert capitalize_address('thames 500 pb') == 'Thames 500 PB'
    assert capitalize_address('belgrano s/n, caba') == 'Belgrano S/N, CABA'


def test_capitalize_address_keeps_trailing_punctuation():
    assert capitalize_address('mitre 100 pb, dto 4') == 'Mitre 100 PB, Dto. 4'
    assert capitalize_address('esq. san martín; mz 3') == 'Esq. San Martín; Mz. 3'


def test_capitalize_address_abbreviation_only_as_whole_word():
    assert capitalize_address('avellaneda 200') == 'Avellaneda 200'
    assert capitalize_address('drago 15') == 'Drago 15'


def test_capitalize_address_empty_values():
    assert capitalize_address('') == ''
    assert capitalize_address(None) is None


def test_capitalize_words_does_not_touch_address_abbreviations():
    assert capitalize_words('dr juan') == 'Dr Juan'
