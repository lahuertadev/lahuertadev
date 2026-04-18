import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Paper, Typography, Button, CircularProgress, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import PrintIcon from '@mui/icons-material/Print';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import BasicSelect from '../../components/Select';
import BasicDatePicker from '../../components/DatePicker';
import { clientUrl, clientReportUrl } from '../../constants/urls';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import '../../styles/print-reports.css';
import logoLaHuerta from '../../assets/logo-lahuerta.jpg';

const PERIOD_OPTIONS = [
  { name: 'Día',    value: 'dia' },
  { name: 'Semana', value: 'semana' },
  { name: 'Mes',    value: 'mes' },
  { name: 'Año',    value: 'anio' },
];

const today = new Date().toISOString().split('T')[0];

const ClientReport = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState({ name: 'Mes', value: 'mes' });
  const [refDate, setRefDate] = useState(today);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hiddenBars, setHiddenBars] = useState({});

  useEffect(() => {
    axios.get(clientUrl).then(res => {
      const data = res.data.results ?? res.data;
      setClients(data.map(c => ({ name: c.razon_social, value: c.id })));
    });
  }, []);

  useEffect(() => {
    if (!report || !selectedClient) return;
    const originalTitle = document.title;
    const from = formatDate(report.date_from);
    const to = formatDate(report.date_to);
    document.title = `Reporte ${selectedClient.name} ${from} al ${to}`;
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
      const res = await axios.get(`${clientReportUrl}${selectedClient.value}/`, {
        params: { period: selectedPeriod.value, date: refDate },
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
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={() => window.print()}
          disabled={!report}
          sx={{ fontWeight: 600 }}
        >
          Imprimir Reporte
        </Button>
      </div>

      {/* ── Filtros ── */}
      <Paper className="report-filters no-print" sx={{ p: 2, mb: 3 }}>
        <div className="report-filters-grid">
          <BasicSelect
            label="Cliente"
            name="client"
            value={selectedClient}
            options={clients}
            onChange={e => setSelectedClient(e.target.value)}
          />
          <BasicSelect
            label="Período"
            name="period"
            value={selectedPeriod}
            options={PERIOD_OPTIONS}
            onChange={e => setSelectedPeriod(e.target.value)}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#596064' }}>
                Fecha de referencia
              </span>
              <Tooltip
                title="Seleccioná cualquier fecha dentro del período que querés consultar. Por ejemplo, si elegís «Mes» y seleccionás el 15 de marzo, el reporte mostrará todo marzo."
                placement="top"
                arrow
              >
                <InfoOutlinedIcon sx={{ fontSize: 14, color: '#9ca3af', cursor: 'default' }} />
              </Tooltip>
            </div>
            <BasicDatePicker
              name="refDate"
              value={refDate}
              onChange={setRefDate}
            />
          </div>
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={!selectedClient || loading}
            sx={{ fontWeight: 600, height: 40, alignSelf: 'flex-end' }}
          >
            Aplicar Filtros
          </Button>
        </div>
      </Paper>

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
                <span className="report-print-meta-value">{selectedClient?.name}</span>
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
            const pendingBalance = parseFloat(report.kpis.pending_balance);
            const paidRatio = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

            return (
              <div className="report-kpis">
                <Paper className="report-kpi-card" sx={{ p: 3, position: 'relative', overflow: 'hidden' }}>
                  <div className="report-kpi-bg-icon"><ReceiptLongIcon /></div>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">
                    Total Facturado
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    en el período · {periodLabel}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="text.primary" sx={{ mt: 1 }}>
                    {formatCurrency(report.kpis.total_billed)}
                  </Typography>
                </Paper>

                <Paper className="report-kpi-card" sx={{ p: 3, position: 'relative', overflow: 'hidden' }}>
                  <div className="report-kpi-bg-icon"><PaymentsIcon /></div>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">
                    Total Pagado
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    en el período ·{' '}
                    <span style={{ color: paidRatio >= 80 ? '#16a34a' : paidRatio >= 50 ? '#ca8a04' : '#dc2626', fontWeight: 700 }}>
                      {paidRatio}% cobrado
                    </span>
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="text.primary" sx={{ mt: 1 }}>
                    {formatCurrency(report.kpis.total_paid)}
                  </Typography>
                </Paper>

                <Paper
                  className="report-kpi-card"
                  sx={{ p: 3, position: 'relative', overflow: 'hidden', bgcolor: pendingBalance > 0 ? '#fff5f5' : 'background.paper' }}
                >
                  <div className="report-kpi-bg-icon"><AccountBalanceWalletIcon /></div>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">
                    Saldo Pendiente
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    en el período
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    sx={{ mt: 1, color: pendingBalance > 0 ? 'error.main' : 'text.primary' }}
                  >
                    {formatCurrency(report.kpis.pending_balance)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, pt: 1.5, borderTop: '1px solid #f0f0f0' }}>
                    Cuenta corriente total
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    sx={{ color: parseFloat(report.kpis.account_balance) > 0 ? 'error.main' : 'text.primary' }}
                  >
                    {formatCurrency(report.kpis.account_balance)}
                  </Typography>
                </Paper>
              </div>
            );
          })()}

          {/* ── Gráfico ── */}
          <Paper className="no-print" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Evolución de Pagos vs Facturación
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={report.chart} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip formatter={v => formatCurrency(v)} />
                <Legend content={renderLegend} />
                <Bar dataKey="billed" name="Facturado" fill="#4a7bc4" radius={[4, 4, 0, 0]} hide={!!hiddenBars.billed} />
                <Bar dataKey="paid" name="Pagado" fill="#a8c4e8" radius={[4, 4, 0, 0]} hide={!!hiddenBars.paid} />
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
                      <th>Nro</th>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th className="text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.bills.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-secondary">
                          Sin facturas en el período
                        </td>
                      </tr>
                    ) : (
                      report.bills.map(b => (
                        <tr key={b.id}>
                          <td className="text-secondary">#{b.id}</td>
                          <td>{formatDate(b.fecha)}</td>
                          <td>{b.tipo_factura?.descripcion ?? '—'}</td>
                          <td className="text-right font-bold">{formatCurrency(b.importe)}</td>
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
                      <th>Fecha</th>
                      <th>Medio</th>
                      <th className="text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.payments.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center text-secondary">
                          Sin pagos en el período
                        </td>
                      </tr>
                    ) : (
                      report.payments.map(p => (
                        <tr key={p.id}>
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

          {/* ── Footer visual, fijo al pie de cada hoja ── */}
          <div className="print-only report-print-footer">
            <Typography variant="caption" color="text.secondary">
              © {new Date().getFullYear()} La Huerta Agro Management · Documento de uso interno ·{' '}
              {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </Typography>
          </div>

        </div>
      )}
    </div>
  );
};

export default ClientReport;
