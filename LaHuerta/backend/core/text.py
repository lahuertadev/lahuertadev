# Tipos societarios argentinos: se escriben siempre en mayúscula y con puntos,
# sin importar cómo se tipeen ("sa", "S.A", "s.a." -> "S.A.").
COMPANY_TYPES = {
    'sa': 'S.A.',
    'sas': 'S.A.S.',
    'sau': 'S.A.U.',
    'srl': 'S.R.L.',
    'sh': 'S.H.',
    'sca': 'S.C.A.',
    'scs': 'S.C.S.',
    'saci': 'S.A.C.I.',
    'sacif': 'S.A.C.I.F.',
}


def _capitalize_word(word):
    company_type = COMPANY_TYPES.get(word.replace('.', '').lower())
    if company_type:
        return company_type
    return word.capitalize()


def capitalize_words(value):
    '''
    Pone en mayúscula la primera letra de cada palabra y el resto en minúscula.
    Los tipos societarios se escriben con mayúsculas y puntos (ver COMPANY_TYPES).
    '''
    if not value:
        return value
    return ' '.join(_capitalize_word(word) for word in value.split())
