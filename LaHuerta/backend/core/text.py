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

# Abreviaturas de las direcciones: se reconocen con o sin punto y en cualquier combinación de
# mayúsculas ("AV", "av", "av.") y se escriben de una sola forma. Las abreviaturas llevan punto;
# los símbolos (Km) y las siglas (PB, CABA) no.
ADDRESS_ABBREVIATIONS = {
    'av': 'Av.',
    'avda': 'Avda.',
    'bv': 'Bv.',
    'bvar': 'Bvar.',
    'pje': 'Pje.',
    'diag': 'Diag.',
    'gral': 'Gral.',
    'cnel': 'Cnel.',
    'tte': 'Tte.',
    'pte': 'Pte.',
    'dr': 'Dr.',
    'ing': 'Ing.',
    'gdor': 'Gdor.',
    'sta': 'Sta.',
    'sto': 'Sto.',
    'nro': 'Nro.',
    'esq': 'Esq.',
    'dto': 'Dto.',
    'dpto': 'Dpto.',
    'mz': 'Mz.',
    'mza': 'Mza.',
    'km': 'Km',
    'pb': 'PB',
    'uf': 'UF',
    'ph': 'PH',
    's/n': 'S/N',
    'caba': 'CABA',
}

# Puntuación pegada al final de una palabra que no es parte de ella (ej. "pb, dto 4").
TRAILING_PUNCTUATION = re.compile(r'^(.*?)([,;]*)$')


def _capitalize_word(word):
    lower_word = word.lower()
    company_type = COMPANY_TYPES.get(lower_word.replace('.', ''))
    if company_type:
        return company_type
    if len(word) > 1 and ROMAN_NUMERAL.match(lower_word):
        return word.upper()
    return word.capitalize()


def _capitalize_address_word(word):
    body, punctuation = TRAILING_PUNCTUATION.match(word).groups()
    abbreviation = ADDRESS_ABBREVIATIONS.get(body.lower().replace('.', ''))
    if abbreviation:
        return abbreviation + punctuation
    return _capitalize_word(word)


def capitalize_words(value):
    '''
    Pone en mayúscula la primera letra de cada palabra y el resto en minúscula.
    Los tipos societarios se escriben con mayúsculas y puntos (ver COMPANY_TYPES) y los
    números romanos en mayúscula (ver ROMAN_NUMERAL).
    '''
    if not value:
        return value
    return ' '.join(_capitalize_word(word) for word in value.split())


def capitalize_address(value):
    '''
    Igual que capitalize_words, y además escribe las abreviaturas de las direcciones de una sola
    forma (ver ADDRESS_ABBREVIATIONS): "av corrientes 1234 pb" -> "Av. Corrientes 1234 PB".
    '''
    if not value:
        return value
    return ' '.join(_capitalize_address_word(word) for word in value.split())
