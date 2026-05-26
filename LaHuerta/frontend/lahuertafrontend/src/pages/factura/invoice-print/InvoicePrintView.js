import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { billUrl } from '../../../constants/urls';
import '../../../styles/print-invoice.css';
import logoLaHuerta from '../../../assets/logo-lahuerta-sin-fondo.png';

const EMISOR = {
  nombre: 'LA HUERTA',
  razonSocial: 'ANTÚNEZ NICOLÁS SEBASTIAN',
  domicilio: 'Avenida Gaona 4532 - Ciudadela, Buenos Aires',
  condicion: 'IVA Responsable Inscripto',
  cuit: '20-33116290-7',
  iibb: '20-33116290-7',
  inicioActividades: '01/05/2010',
};

const PUNTO_VENTA = 3;
const ITEMS_PER_PAGE = 15;

const formatDateAR = (isoDate) => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
};

const padNumber = (n, length) => String(n || 0).padStart(length, '0');

const buildAfipQRUrl = (bill) => {
  const data = {
    ver: 1,
    fecha: bill.fecha,
    cuit: 20331162907,
    ptoVta: PUNTO_VENTA,
    tipoCmp: bill.tipo_factura.codigo_afip,
    nroCmp: bill.numero_comprobante,
    importe: parseFloat(bill.importe) * 1.105,
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: 80,
    nroDocRec: parseInt(bill.cliente.cuit.replace(/[-\s]/g, ''), 10),
    tipoCodAut: 'E',
    codAut: parseInt(bill.cae, 10),
  };
  return `https://www.afip.gob.ar/fe/qr/?p=${btoa(JSON.stringify(data))}`;
};

const InvoicePrintView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${billUrl}${id}/`)
      .then((r) => setBill(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 24 }}>Cargando factura…</div>;
  if (!bill) return <div style={{ padding: 24 }}>Factura no encontrada.</div>;

  const { cliente, tipo_factura, fecha, importe, items = [], numero_comprobante, cae, cae_vto } = bill;

  const netAmount = parseFloat(importe);
  const vatAmount = netAmount * 0.105;
  const totalAmount = netAmount * 1.105;

  const ptoVtaStr = padNumber(PUNTO_VENTA, 5);
  const nroCompStr = padNumber(numero_comprobante, 8);
  const qrUrl = buildAfipQRUrl(bill);

  const itemPages = [];
  for (let i = 0; i < Math.max(items.length, 1); i += ITEMS_PER_PAGE) {
    itemPages.push(items.slice(i, i + ITEMS_PER_PAGE));
  }

  return (
    <div className="invoice-page">
      <div className="invoice-actions no-print">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/bill')}
          color="primary"
          variant="outlined"
        >
          Volver al listado
        </Button>
        <button onClick={() => window.print()} className="btn-print">
          🖨 Imprimir / Guardar PDF
        </button>
      </div>

      {itemPages.map((pageItems, pageIdx) => (
        <div
          key={pageIdx}
          className={`invoice${pageIdx < itemPages.length - 1 ? ' invoice-break' : ''}`}
        >
          <div className="invoice-original">ORIGINAL</div>

          {/* Cabecera */}
          <div className="invoice-header">
            <div className="invoice-empresa">
              <img src={logoLaHuerta} alt="La Huerta" className="invoice-empresa-logo" />
              <div className="invoice-empresa-sub"><b>Razón Social:</b> {EMISOR.razonSocial}</div>
              <div className="invoice-empresa-sub"><b>Domicilio Comercial:</b> {EMISOR.domicilio}</div>
              <div className="invoice-empresa-sub"><b>Condición frente al IVA:</b> {EMISOR.condicion}</div>
            </div>

            <div className="invoice-tipo-box">
              <div className="invoice-tipo-letra">{tipo_factura?.abreviatura}</div>
              <div className="invoice-tipo-cod">COD. {padNumber(tipo_factura?.codigo_afip, 2)}</div>
            </div>

            <div className="invoice-titulo-col">
              <div className="invoice-titulo">Factura</div>
              <div className="invoice-numero-row">
                <span className="invoice-numero-label">Punto de Venta: </span>{ptoVtaStr}
                &nbsp;&nbsp;&nbsp;
                <span className="invoice-numero-label">Comp. Nro: </span>{nroCompStr}
              </div>
              <div className="invoice-fecha-row">
                <span className="invoice-numero-label">Fecha de Emisión: </span>{formatDateAR(fecha)}
              </div>
              <div className="invoice-fiscal-data">
                <div><b>CUIT:</b> {EMISOR.cuit}</div>
                <div><b>Ingresos Brutos:</b> {EMISOR.iibb}</div>
                <div><b>Fecha de Inicio de Actividades:</b> {EMISOR.inicioActividades}</div>
              </div>
            </div>
          </div>

          {/* Datos receptor */}
          <div className="invoice-receptor">
            <div className="invoice-receptor-col">
              <div className="invoice-receptor-row">
                <span className="invoice-label">CUIT:</span>
                <span className="invoice-value-line">{cliente?.cuit}</span>
              </div>
              <div className="invoice-receptor-row">
                <span className="invoice-label">Condición frente al IVA:</span>
                <span className="invoice-value-line">{cliente?.condicion_IVA?.descripcion}</span>
              </div>
              <div className="invoice-receptor-row">
                <span className="invoice-label">Condición de venta:</span>
                <span className="invoice-value-line">Cuenta Corriente</span>
              </div>
            </div>
            <div className="invoice-receptor-col">
              <div className="invoice-receptor-row">
                <span className="invoice-label">Apellido y Nombre / Razón Social:</span>
                <span className="invoice-value-line">{cliente?.razon_social}</span>
              </div>
              <div className="invoice-receptor-row">
                <span className="invoice-label">Domicilio Comercial:</span>
                <span className="invoice-value-line">
                  {[
                    cliente?.domicilio,
                    cliente?.localidad?.nombre,
                    cliente?.localidad?.municipio?.nombre,
                    cliente?.localidad?.municipio?.provincia?.nombre,
                  ].filter(Boolean).join(' - ')}
                </span>
              </div>
            </div>
          </div>

          {/* Tabla productos */}
          <div className="invoice-tabla-wrapper">
            <table className="invoice-tabla">
              <thead>
                <tr>
                  <th style={{ width: '18%' }}>PRODUCTO / SERVICIO</th>
                  <th style={{ width: '8%' }}>CANT.</th>
                  <th style={{ width: '10%' }}>U. MEDIDA</th>
                  <th style={{ width: '12%' }}>PRECIO UNIT.</th>
                  <th style={{ width: '8%' }}>% BONIF.</th>
                  <th style={{ width: '12%' }}>SUBTOTAL</th>
                  <th style={{ width: '10%' }}>ALÍC. IVA</th>
                  <th style={{ width: '12%' }}>SUBTOTAL C/IVA</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item, idx) => {
                  const qty = parseFloat(item.cantidad) || 0;
                  const unitPrice = parseFloat(item.precio_aplicado) || 0;
                  const subtotal = qty * unitPrice;
                  const subtotalWithVat = subtotal * 1.105;
                  const isBulk = item.tipo_venta?.descripcion?.toLowerCase() === 'bulto';
                  const unitMedida = isBulk
                    ? item.producto?.tipo_contenedor?.descripcion
                    : item.producto?.tipo_unidad?.descripcion;
                  return (
                    <tr key={idx}>
                      <td className="desc">{item.producto?.descripcion}</td>
                      <td className="center">{qty}</td>
                      <td className="center">{unitMedida || ''}</td>
                      <td>{unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="center">0,00</td>
                      <td>{subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="center">10,5%</td>
                      <td>{subtotalWithVat.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
                {Array.from({ length: Math.max(0, ITEMS_PER_PAGE - pageItems.length) }).map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td className="desc">&nbsp;</td>
                    <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Otros tributos */}
          <div className="invoice-tributos">
            <span><b>Cantidad de productos:</b> {items.length}</span>
            <span><b>Importe Otros Tributos:</b> $ 0,00</span>
          </div>

          {/* Totales */}
          <div className="invoice-totales">
            <div className="invoice-totales-row">
              <span>Importe Neto Gravado:</span>
              <span>$ {netAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="invoice-totales-row">
              <span>IVA 10,5%:</span>
              <span>$ {vatAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="invoice-totales-row total-final">
              <span>Importe Total:</span>
              <span>$ {totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Footer CAE + QR */}
          <div className="invoice-footer-cae">
            <div className="invoice-footer-left">
              <div className="invoice-footer-qr">
                <QRCodeSVG value={qrUrl} size={80} />
              </div>
              <div className="invoice-footer-afip">
                <div className="invoice-footer-arca-box">
                  <div className="invoice-footer-arca-title">ARCA</div>
                  <div className="invoice-footer-arca-sub">Agencia de Recaudación<br />y Control Aduanero</div>
                </div>
              </div>
            </div>
            <div className="invoice-footer-pagina">
              Hoja {pageIdx + 1} de {itemPages.length}
            </div>
            <div className="invoice-footer-cae-data">
              <div className="invoice-footer-cae-row"><b>CAE N°:</b> {cae}</div>
              <div className="invoice-footer-cae-row"><b>Fecha de Vto. de CAE:</b> {formatDateAR(cae_vto)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InvoicePrintView;
