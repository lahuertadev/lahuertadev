import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { billUrl } from '../../constants/urls';
import '../../styles/print-remito.css';

const LA_HUERTA = {
  nombre: 'La Huerta',
  propietario: 'de Walter Antúnez',
  direccion: 'Nave 4 Puesto 16/18',
  email: 'nantunez@distribuidoralahuerta.com',
  tel: '1160948301 / 1137958448',
  condicion: 'IVA RESPONSABLE INSCRIPTO',
};

const formatDateAR = (isoDate) => {
  if (!isoDate) return '  /  /  ';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
};

const BillPrintView = () => {
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

  if (loading) return <div className="print-loading">Cargando remito…</div>;
  if (!bill) return <div className="print-loading">Remito no encontrado.</div>;

  const { cliente, tipo_factura, fecha, importe, items = [] } = bill;
  const billNumber = String(bill.id).padStart(8, '0');
  const [serie, numero] = ['00001', billNumber.slice(-4)];

  return (
    <div className="remito-page">
      {/* Botones de acción (no se imprimen) */}
      <div className="print-actions no-print">
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

      {/* ══════════════════ REMITO ══════════════════ */}
      <div className="remito">
        {/* CABECERA */}
        <div className="remito-header">
          {/* Columna izquierda: datos de La Huerta */}
          <div className="remito-empresa">
            <div className="remito-empresa-nombre">{LA_HUERTA.nombre}</div>
            <div className="remito-empresa-sub">{LA_HUERTA.propietario}</div>
            <div className="remito-empresa-sub">{LA_HUERTA.direccion}</div>
            <div className="remito-empresa-sub">Email: {LA_HUERTA.email}</div>
            <div className="remito-empresa-sub">Tel: {LA_HUERTA.tel}</div>
          </div>

          {/* Centro: tipo de comprobante */}
          <div className="remito-tipo-box">
            <div className="remito-tipo-letra">{tipo_factura?.descripcion || 'X'}</div>
            <div className="remito-tipo-sub">Documento No Válido como Factura</div>
          </div>

          {/* Columna derecha: título + número + fecha */}
          <div className="remito-titulo-col">
            <div className="remito-titulo">REMITO</div>
            <div className="remito-numero">N° {serie} - {numero}</div>
            <div className="remito-fecha-box">
              <span className="remito-fecha-label">FECHA</span>
              <span className="remito-fecha-val">{formatDateAR(fecha)}</span>
            </div>
          </div>
        </div>

        {/* Condición del emisor */}
        <div className="remito-condicion-emisor">{LA_HUERTA.condicion}</div>

        {/* Datos del receptor */}
        <div className="remito-receptor">
          <div className="remito-receptor-row">
            <span className="remito-label">Señor(es):</span>
            <span className="remito-value remito-value-line">{cliente?.razon_social}</span>
          </div>
          <div className="remito-receptor-row">
            <span className="remito-label">Domicilio:</span>
            <span className="remito-value remito-value-line">{cliente?.domicilio || ''}</span>
          </div>
          <div className="remito-receptor-row remito-receptor-row-split">
            <div className="remito-receptor-left">
              <span className="remito-label">Localidad:</span>
              <span className="remito-value remito-value-line">{cliente?.localidad?.nombre || ''}</span>
            </div>
            <div className="remito-receptor-right">
              <span className="remito-label">Cliente N°:</span>
              <span className="remito-value">{String(cliente?.id).padStart(6, '0')}</span>
            </div>
          </div>
        </div>

        {/* IVA y condición */}
        <div className="remito-iva-row">
          <div className="remito-iva-checks">
            <span className="remito-iva-label">I.V.A. Responsable Inscripto</span>
            <CheckBox checked={cliente?.condicion_IVA?.descripcion === 'Responsable Inscripto'} label="Resp. Inscripto" />
            <CheckBox checked={cliente?.condicion_IVA?.descripcion === 'Monotributista'} label="Resp. Monotributo" />
            <CheckBox checked={cliente?.condicion_IVA?.descripcion === 'No Responsable'} label="No Resp." />
            <CheckBox checked={cliente?.condicion_IVA?.descripcion === 'Consumidor Final'} label="Consumidor Final" />
            <CheckBox checked={cliente?.condicion_IVA?.descripcion === 'Exento'} label="Exento" />
          </div>
          <div className="remito-cuit">
            <span className="remito-label">C.U.I.T.:</span>
            <span className="remito-value">{cliente?.cuit}</span>
          </div>
        </div>

        {/* Ing. Brutos + Factura N° */}
        <div className="remito-extra-row">
          <span className="remito-label">Ing. Brutos:</span>
          <span className="remito-value remito-value-line flex-1"></span>
          <span className="remito-label ml-6">Factura N°:</span>
          <span className="remito-value remito-value-line w-32"></span>
        </div>

        {/* Cond. de Venta */}
        <div className="remito-cond-venta">
          <span className="remito-label">Cond. de Venta</span>
          <CheckBox checked={tipo_factura?.descripcion?.toLowerCase().includes('contado')} label="Contado" />
          <CheckBox checked={tipo_factura?.descripcion?.toLowerCase().includes('cta') || tipo_factura?.descripcion?.toLowerCase().includes('corriente')} label="Cta.Cte." />
          <CheckBox checked={tipo_factura?.descripcion?.toLowerCase().includes('tarjeta')} label="Tarjeta" />
        </div>

        {/* Tabla de productos */}
        <table className="remito-tabla">
          <thead>
            <tr>
              <th className="remito-tabla-cant">CANT.</th>
              <th className="remito-tabla-desc">DESCRIPCION</th>
              <th className="remito-tabla-subtotal">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const qty = parseFloat(it.cantidad) || 0;
              const isBulk = it.precio_bulto && parseFloat(it.precio_bulto) > 0;
              const price = isBulk
                ? parseFloat(it.precio_bulto)
                : parseFloat(it.precio_unitario) || 0;
              const subtotal = qty * price;
              const tipoLabel = isBulk
                ? it.producto?.tipo_contenedor?.abreviacion
                : it.producto?.tipo_unidad?.abreviacion;
              return (
                <tr key={idx} className="remito-tabla-row">
                  <td className="remito-tabla-cant-cell">
                    {it.cantidad}{tipoLabel && <span className="remito-cant-tipo">&nbsp;{tipoLabel}</span>}
                  </td>
                  <td className="remito-tabla-desc-cell">{it.producto?.descripcion}</td>
                  <td className="remito-tabla-subtotal-cell">
                    ${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
            {/* Filas vacías para completar el remito */}
            {Array.from({ length: Math.max(0, 12 - items.length) }).map((_, i) => (
              <tr key={`empty-${i}`} className="remito-tabla-row">
                <td className="remito-tabla-cant-cell">&nbsp;</td>
                <td className="remito-tabla-desc-cell">&nbsp;</td>
                <td className="remito-tabla-subtotal-cell">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div className="remito-total-row">
          <span className="remito-total-label">TOTAL</span>
          <span className="remito-total-value">$ {parseFloat(importe).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
        </div>

        {/* Firma */}
        <div className="remito-footer remito-footer-spacer">
          <div className="remito-footer-col">
            <div className="remito-footer-line"></div>
            <div className="remito-footer-label">FIRMA</div>
          </div>
          <div className="remito-footer-col">
            <div className="remito-footer-line"></div>
            <div className="remito-footer-label">ACLARACIÓN</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Pequeño componente checkbox de solo lectura
const CheckBox = ({ checked, label }) => (
  <span className="remito-check-item">
    <span className={`remito-check-box ${checked ? 'remito-check-checked' : ''}`}>
      {checked ? 'X' : ''}
    </span>
    <span className="remito-check-label">{label}</span>
  </span>
);

export default BillPrintView;
