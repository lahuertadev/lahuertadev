import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Paper, Typography, CircularProgress, Tooltip, useMediaQuery } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLongOutlined';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import ClientAutocomplete from '../../components/ClientAutocomplete';
import SpotlightButton from '../../components/SpotlightButton';
import PeriodNavigator from './PeriodNavigator';
import { clientUrl, clientReportUrl } from '../../constants/urls';
import { useNavigate } from 'react-router-dom';
import { breadcrumbsMap } from '../../constants/breadcrumbs';
import { formatCurrency } from '../../utils/currency';
import { formatDate, getTodayDate } from '../../utils/date';
import '../../styles/print-reports.css';
import logoLaHuerta from '../../assets/logo-lahuerta.jpg';

const PERIOD_OPTIONS = [
  { name: 'Diario',   value: 'dia' },
  { name: 'Semanal',  value: 'semana' },
  { name: 'Mensual',  value: 'mes' },
  { name: 'Anual',    value: 'anio' },
];

const ClientReport = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
  const breadcrumbs = breadcrumbsMap['/report'];
  const today = getTodayDate();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [period, setPeriod] = useState({ period: 'mes', date: today });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hiddenBars, setHiddenBars] = useState({});

  useEffect(() => {
    axios.get(clientUrl).then(res => {
      const data = res.data.results ?? res.data;
      setClients(data);
    });
  }, []);

  useEffect(() => {
    if (!report || !selectedClient) return;
    const originalTitle = document.title;
    const from = formatDate(report.date_from);
    const to = formatDate(report.date_to);
    document.title = `Reporte ${selectedClient.razon_social} ${from} al ${to}`;
    return () => { document.title = originalTitle; };
  }, [report, selectedClient]);

  const handleLegendClick = (entry) => {
    const key = entry.dataKey;
    setHiddenBars(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: 12, marginTop: 8 }}>
        {payload.map((entry) => (
          <span
            key={entry.dataKey}
            onClick={() => handleLegendClick(entry)}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: hiddenBars[entry.dataKey] ? 0.35 : 1,
              userSelect: 'none',
            }}
          >
            <span style={{
              width: 12, height: 12, borderRadius: 3,
              background: hiddenBars[entry.dataKey] ? '#ccc' : entry.color,
              display: 'inline-block',
              transition: 'background 0.2s',
            }} />
            <span style={{ textDecoration: hiddenBars[entry.dataKey] ? 'line-through' : 'none' }}>
              {entry.value}
            </span>
          </span>
        ))}
      </div>
    );
  };

  const handleApply = async () => {
    if (!selectedClient) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${clientReportUrl}${selectedClient.id}/`, {
        params: { period: period.period, date: period.date },
      });
      setReport(res.data);
    } catch (err) {
      setError('No se pudo cargar el reporte. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="report-page">

      {/* ── Breadcrumb ── */}
      <nav
        className="no-print"
        style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-on-surface-muted)', marginBottom: '16px' }}
      >
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-muted)' }}>›</span>}
            {crumb.path ? (
              <span style={{ whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => navigate(crumb.path)}>
                {crumb.label}
              </span>
            ) : (
              <span style={{ whiteSpace: 'nowrap', fontWeight: 700, color: 'var(--color-on-surface)' }}>{crumb.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* ── Header ── */}
      <div className="report-header no-print">
        <div>
          <Typography variant="h5" fontWeight="bold" color="text.primary">
            Reporte de Cliente
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Análisis detallado de movimientos, facturación y saldos.
          </Typography>
        </div>
        <SpotlightButton
          variant="primary"
          onClick={() => window.print()}
          disabled={!report}
          className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold whitespace-nowrap"
        >
          <PrintOutlinedIcon sx={{ fontSize: 18 }} /> {isMobile ? 'Guardar PDF' : 'Imprimir Reporte'}
        </SpotlightButton>
      </div>

      {/* ── Filtros ── */}
      <div className="report-filters no-print mb-6 rounded-xl border border-border-subtle bg-surface-card p-5 shadow-sm">
        <div className="report-filters-grid">
          <div>
            <span className="report-filter-label">Cliente</span>
            <ClientAutocomplete clients={clients} value={selectedClient} onChange={setSelectedClient} />
          </div>
          <div>
            <span className="report-filter-label">Período</span>
            <PeriodNavigator period={period.period} date={period.date} today={today} onChange={setPeriod} />
          </div>
          <SpotlightButton
            variant="primary"
            onClick={handleApply}
            disabled={!selectedClient || loading}
            className="w-full sm:w-auto h-11 px-5 text-sm font-semibold whitespace-nowrap"
          >
            <CalendarMonthOutlinedIcon sx={{ fontSize: 18 }} /> Aplicar
          </SpotlightButton>
        </div>
      </div>

      {/* ── Loading / Error ── */}
      {loading && (
        <Box className="no-print" sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {error && !loading && (
        <Typography color="error" className="no-print" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* ── Contenido del reporte ── */}
      {report && !loading && (
        <div className="report-content">

          {/* ── Tabla wrapper: thead/tfoot se repiten en cada hoja impresa ── */}
          <table className="report-print-wrapper">
            <thead>
              <tr>
                <td>
                  <div className="report-print-header-top">
                    <img src={logoLaHuerta} alt="La Huerta" className="report-print-logo" />
                    <div className="report-print-company">
                      <span className="report-print-company-name">La Huerta</span>
                      <span className="report-print-company-sub">contacto@lahuerta.com.ar</span>
                    </div>
                  </div>
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>

          {/* ── Título y meta — solo en impresión, solo hoja 1 ── */}
          <div className="print-only report-print-header">
            <h2 className="report-print-title">Reporte de Estado de Cuenta</h2>
            <div className="report-print-meta">
              <div>
                <span className="report-print-meta-label">Cliente</span>
                <span className="report-print-meta-value">{selectedClient?.razon_social}</span>
              </div>
              <div>
                <span className="report-print-meta-label">Período</span>
                <span className="report-print-meta-value">
                  {formatDate(report.date_from)} – {formatDate(report.date_to)}
                </span>
              </div>
              <div className="report-print-meta-right">
                <span className="report-print-meta-label">Fecha de Emisión</span>
                <span className="report-print-meta-value">
                  {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* ── KPIs ── */}
          {(() => {
            const periodLabel = PERIOD_OPTIONS.find(o => o.value === report.period)?.name ?? '';
            const totalBilled = parseFloat(report.kpis.total_billed);
            const totalPaid = parseFloat(report.kpis.total_paid);
            const totalCredited = parseFloat(report.kpis.total_credited);
            const pendingBalance = parseFloat(report.kpis.pending_balance);
            const paidRatio = totalBilled > 0 ? Math.round(((totalPaid + totalCredited) / totalBilled) * 1000) / 10 : 0;

            return (
              <div className="report-kpis">
                <Paper className="report-kpi-card" sx={{ p: 3, position: 'relative', overflow: 'hidden' }}>
                  <div className="report-kpi-bg-icon"><ReceiptLongIcon /></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase" className="report-kpi-print-ink">
                      Total Facturado
                    </Typography>
                    <Tooltip title="Suma de facturas y notas de débito emitidas en el período. Las notas de crédito se muestran por separado." placement="top" arrow>
                      <InfoOutlinedIcon className="no-print" sx={{ fontSize: 13, color: 'var(--color-on-surface-muted)', cursor: 'default' }} />
                    </Tooltip>
                  </div>
                  <Typography variant="caption" color="text.secondary" className="report-kpi-print-ink" sx={{ display: 'block' }}>
                    en el período · {periodLabel}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="text.primary" className="report-kpi-print-ink" sx={{ mt: 1 }}>
                    {formatCurrency(report.kpis.total_billed)}
                  </Typography>
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-border-subtle)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {parseFloat(report.kpis.total_invoiced) > 0 && (
                      <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-on-surface-muted)' }}>Facturas</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>{formatCurrency(report.kpis.total_invoiced)}</span>
                      </Typography>
                    )}
                    {parseFloat(report.kpis.total_debit_notes) > 0 && (
                      <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-on-surface-muted)' }}>Notas de Débito</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>{formatCurrency(report.kpis.total_debit_notes)}</span>
                      </Typography>
                    )}
                  </div>
                </Paper>

                <Paper className="report-kpi-card" sx={{ p: 3, position: 'relative', overflow: 'hidden' }}>
                  <div className="report-kpi-bg-icon"><PaymentsIcon /></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase" className="report-kpi-print-ink">
                      Total Pagado
                    </Typography>
                    <Tooltip title="Suma de los pagos en efectivo, cheque u otros medios registrados en el período. No incluye notas de crédito." placement="top" arrow>
                      <InfoOutlinedIcon className="no-print" sx={{ fontSize: 13, color: 'var(--color-on-surface-muted)', cursor: 'default' }} />
                    </Tooltip>
                  </div>
                  <Typography variant="caption" color="text.secondary" className="report-kpi-print-ink" sx={{ display: 'block' }}>
                    en el período ·{' '}
                    <span style={{ color: paidRatio >= 80 ? '#16a34a' : paidRatio >= 50 ? '#ca8a04' : '#dc2626', fontWeight: 700 }}>
                      {paidRatio}% cobrado
                    </span>
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="text.primary" className="report-kpi-print-ink" sx={{ mt: 1 }}>
                    {formatCurrency(report.kpis.total_paid)}
                  </Typography>
                </Paper>

                <Paper
                  className="report-kpi-card"
                  sx={{ p: 3, position: 'relative', overflow: 'hidden', bgcolor: pendingBalance > 0 ? 'rgba(220,38,38,0.08)' : 'background.paper' }}
                >
                  <div className="report-kpi-bg-icon"><AccountBalanceWalletIcon /></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase" className="report-kpi-print-ink">
                      Saldo Pendiente
                    </Typography>
                    <Tooltip title="Total facturado menos notas de crédito acreditadas y pagos del período. Un valor negativo indica saldo a favor del cliente." placement="top" arrow>
                      <InfoOutlinedIcon className="no-print" sx={{ fontSize: 13, color: 'var(--color-on-surface-muted)', cursor: 'default' }} />
                    </Tooltip>
                  </div>
                  <Typography variant="caption" color="text.secondary" className="report-kpi-print-ink" sx={{ display: 'block' }}>
                    en el período
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    className={pendingBalance > 0 ? '' : 'report-kpi-print-ink'}
                    sx={{ mt: 1, color: pendingBalance > 0 ? 'error.main' : 'text.primary' }}
                  >
                    {formatCurrency(report.kpis.pending_balance)}
                  </Typography>
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-border-subtle)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {parseFloat(report.kpis.total_credited) > 0 && (
                      <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-on-surface-muted)' }}>NC acreditadas</span>
                        <span style={{ fontWeight: 600, color: '#16a34a' }}>-{formatCurrency(report.kpis.total_credited)}</span>
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-on-surface-muted)' }}>Cuenta corriente</span>
                      <span style={{ fontWeight: 600, color: parseFloat(report.kpis.account_balance) > 0 ? '#dc2626' : 'inherit' }}>
                        {formatCurrency(report.kpis.account_balance)}
                      </span>
                    </Typography>
                  </div>
                </Paper>
              </div>
            );
          })()}

          {/* ── Gráfico ── */}
          <Paper className="no-print" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Evolución de Facturación vs Cobrado
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={report.chart} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6, color: '#374151' }}>{label}</div>
                      <div style={{ color: '#4a7bc4', marginBottom: 2 }}>Facturado : {formatCurrency(d.billed)}</div>
                      <div style={{ color: '#6b9fd4', marginBottom: d.credited > 0 ? 2 : 0 }}>Saldado : {formatCurrency(d.settled)}</div>
                      {parseFloat(d.credited) > 0 && (
                        <div style={{ paddingLeft: 10, color: '#9ca3af', fontSize: 11 }}>
                          <div>Pagos: {formatCurrency(d.paid)}</div>
                          <div>NC: {formatCurrency(d.credited)}</div>
                        </div>
                      )}
                    </div>
                  );
                }} />
                <Legend content={renderLegend} />
                <Bar dataKey="billed" name="Facturado" fill="#4a7bc4" radius={[4, 4, 0, 0]} hide={!!hiddenBars.billed} />
                <Bar dataKey="settled" name="Cobrado" fill="#a8c4e8" radius={[4, 4, 0, 0]} hide={!!hiddenBars.settled} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          {/* ── Tablas ── */}
          <div className="report-tables">

            {/* Facturas */}
            <div>
              <Typography variant="subtitle1" fontWeight="bold" className="report-section-title" sx={{ mb: 1.5 }}>
                Facturas del período
              </Typography>
              <Paper>
                <table className="report-table">
                  <thead>
                    <tr>
                      {!isMobile && <th>Nro</th>}
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th className="text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.bills.length === 0 ? (
                      <tr>
                        <td colSpan={isMobile ? 3 : 4} className="text-center text-secondary">
                          Sin facturas en el período
                        </td>
                      </tr>
                    ) : (
                      report.bills.map(b => (
                        <tr key={b.id}>
                          {!isMobile && <td className="text-secondary">#{b.id}</td>}
                          <td>{formatDate(b.fecha)}</td>
                          <td>{b.tipo_factura?.descripcion ?? '—'}</td>
                          <td className="text-right font-bold" style={{ color: '#dc2626' }}>{formatCurrency(b.total)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {report.bills.length > 0 && (
                    <tbody>
                      <tr className="report-subtotal-row print-only">
                        <td>Total Facturado</td>
                        <td></td>
                        <td></td>
                        <td className="text-right">{formatCurrency(report.kpis.total_billed)}</td>
                      </tr>
                    </tbody>
                  )}
                </table>
              </Paper>
            </div>

            {/* Pagos */}
            <div>
              <Typography variant="subtitle1" fontWeight="bold" className="report-section-title" sx={{ mb: 1.5 }}>
                Pagos del período
              </Typography>
              <Paper>
                <table className="report-table">
                  <thead>
                    <tr>
                      {/* El N° de pago solo en la web: la impresión queda como estaba. */}
                      {!isMobile && <th className="no-print">Nro</th>}
                      <th>Fecha</th>
                      <th>Medio</th>
                      <th className="text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.payments.length === 0 ? (
                      <tr>
                        <td colSpan={isMobile ? 3 : 4} className="text-center text-secondary">
                          Sin pagos en el período
                        </td>
                      </tr>
                    ) : (
                      report.payments.map(p => (
                        <tr key={p.id}>
                          {!isMobile && <td className="text-secondary no-print">#{p.id}</td>}
                          <td>{formatDate(p.fecha_pago)}</td>
                          <td>{p.tipo_pago?.descripcion ?? '—'}</td>
                          <td className="text-right font-bold">{formatCurrency(p.importe)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {report.payments.length > 0 && (
                    <tbody>
                      <tr className="report-subtotal-row print-only">
                        <td>Total Pagado</td>
                        <td></td>
                        <td className="text-right">{formatCurrency(report.kpis.total_paid)}</td>
                      </tr>
                    </tbody>
                  )}
                </table>
              </Paper>
            </div>

            {/* Notas de Crédito */}
            {report.credit_notes.length > 0 && (
              <div>
                <Typography variant="subtitle1" fontWeight="bold" className="report-section-title" sx={{ mb: 1.5 }}>
                  Notas de Crédito del período
                </Typography>
                <Paper>
                  <table className="report-table">
                    <thead>
                      <tr>
                        {!isMobile && <th>Nro</th>}
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th className="text-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.credit_notes.map(cn => (
                        <tr key={cn.id}>
                          {!isMobile && <td className="text-secondary">#{cn.id}</td>}
                          <td>{formatDate(cn.fecha)}</td>
                          <td>{cn.tipo_factura?.descripcion ?? '—'}</td>
                          <td className="text-right font-bold" style={{ color: '#16a34a' }}>
                            -{formatCurrency(cn.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tbody>
                      <tr className="report-subtotal-row print-only">
                        <td>Total Acreditado</td>
                        <td></td>
                        <td></td>
                        <td className="text-right">{formatCurrency(report.kpis.total_credited)}</td>
                      </tr>
                    </tbody>
                  </table>
                </Paper>
              </div>
            )}
          </div>

                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>
                  {/* Reserva el espacio del footer en cada hoja para que el contenido no lo pise */}
                  <div className="report-print-footer-placeholder" />
                </td>
              </tr>
            </tfoot>
          </table>

          {/* ── Footer visual, fijo al pie de cada hoja (igual que el de la lista de precios) ── */}
          <div className="print-only report-print-footer">
            <Typography variant="caption" component="span">Ciudadela, 3 de Febrero, Bs. As.</Typography>
            <Typography variant="caption" component="span">
              Fecha de impresión: {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </Typography>
          </div>

        </div>
      )}
    </div>
  );
};

export default ClientReport;
