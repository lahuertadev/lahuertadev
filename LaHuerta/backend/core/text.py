import re

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


# Números romanos de II a XXXIX (ej. "Secc IV", "Juan XXIII"): van en mayúscula.
# Se limitan a I, V y X para no confundir palabras comunes con romanos ("Mi", "Di", "Mix").
ROMAN_NUMERAL = re.compile(r'^x{0,3}(ix|iv|v?i{0,3})$')


def _capitalize_word(word):
    lower_word = word.lower()
    company_type = COMPANY_TYPES.get(lower_word.replace('.', ''))
    if company_type:
        return company_type
    if len(word) > 1 and ROMAN_NUMERAL.match(lower_word):
        return word.upper()
    return word.capitalize()


def capitalize_words(value):
    '''
    Pone en mayúscula la primera letra de cada palabra y el resto en minúscula.
    Los tipos societarios se escriben con mayúsculas y puntos (ver COMPANY_TYPES) y los
    números romanos en mayúscula (ver ROMAN_NUMERAL).
    '''
    if not value:
        return value
    return ' '.join(_capitalize_word(word) for word in value.split())
