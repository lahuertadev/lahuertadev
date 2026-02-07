class ProductNotFoundException(Exception):
    pass


class ProductDeletionNotAllowedException(Exception):
    """
    Se usa cuando el producto no puede eliminarse por estar asociado
    a entidades del dominio (lista de precios, factura, compra, etc.).
    """

    def __init__(self, detail: str, code: str | None = None):
        super().__init__(detail)
        self.detail = detail
        self.code = code