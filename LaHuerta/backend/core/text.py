def capitalize_words(value):
    '''
    Pone en mayúscula la primera letra de cada palabra y el resto en minúscula.
    También recorta los espacios de los extremos y colapsa los repetidos.
    Ej: "copia de lista  MINO" -> "Copia De Lista Mino".
    '''
    if not value:
        return value
    return ' '.join(word.capitalize() for word in value.split())
