import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Dialog from '@mui/material/Dialog';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { clientUrl, priceListUrl } from '../../../constants/urls';
import RoundedCheckbox from '../../../components/RoundedCheckbox';
import SpotlightButton from '../../../components/SpotlightButton';
import { matchesClientSearch } from '../../../utils/priceList';

/**
 * AssignClientsDialog — asigna una lista de precios a varios clientes de una vez.
 *
 * Solo asigna (no desasigna): sacar a un cliente de la lista lo dejaría sin precios para facturar.
 * Los clientes elegidos que tenían otra lista pasan a esta.
 *
 * Props:
 *   open       — bool
 *   priceList  — { id, nombre } de la lista a asignar
 *   onClose    — () => void
 *   onAssigned — (assignedCount) => void, después de asignar con éxito
 */
// Mismo look que el resto de los diálogos de la app: fondo de card del tema (sin la capa
// clara que MUI le suma al Paper en modo oscuro), borde sutil y esquinas redondeadas.
const paperSx = {
  backgroundColor: 'var(--color-surface-card)',
  backgroundImage: 'none',
  border: '1px solid var(--color-border-subtle)',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  fontFamily: 'inherit',
};

const AssignClientsDialog = ({ open, priceList, onClose, onAssigned }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setSelectedIds(new Set());
    setError(null);
    setLoading(true);
    axios
      .get(clientUrl)
      .then((response) => {
        const activeClients = (response.data || [])
          .filter((client) => client.estado)
          .sort((a, b) => a.razon_social.localeCompare(b.razon_social));
        setClients(activeClients);
      })
      .catch(() => setError('No se pudieron cargar los clientes.'))
      .finally(() => setLoading(false));
  }, [open]);

  const isAlreadyAssigned = (client) => client.lista_precios?.id === priceList?.id;

  const visibleClients = useMemo(
    () => clients.filter((client) => matchesClientSearch(client, search)),
    [clients, search]
  );
  const selectableVisible = visibleClients.filter((client) => !isAlreadyAssigned(client));
  const allVisibleSelected = selectableVisible.length > 0 && selectableVisible.every((client) => selectedIds.has(client.id));
  const someVisibleSelected = selectableVisible.some((client) => selectedIds.has(client.id));
  // Cuántos de los elegidos ya tienen otra lista: es el cambio que conviene confirmar a la vista.
  const changingListCount = clients.filter((client) => selectedIds.has(client.id) && client.lista_precios).length;

  const toggleClient = (clientId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      selectableVisible.forEach((client) => (allVisibleSelected ? next.delete(client.id) : next.add(client.id)));
      return next;
    });
  };

  const handleAssign = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await axios.post(`${priceListUrl}${priceList.id}/assign_clients/`, {
        client_ids: [...selectedIds],
      });
      onAssigned(response.data.assigned);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo asignar la lista. Intentá nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth PaperProps={{ sx: paperSx }}>
      <div className="p-6">
        {/* Encabezado */}
        <h2 className="text-lg font-semibold text-on-surface">Asignar a Clientes</h2>
        <p className="mt-1 text-sm text-on-surface-muted">
          Elegí los clientes que van a usar <strong className="font-semibold text-on-surface">{priceList?.nombre}</strong>.
          Si ya tenían otra lista, pasan a esta.
        </p>

        {/* Buscador */}
        <div className="relative mt-5">
          <SearchOutlinedIcon
            sx={{ fontSize: 20 }}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-accent"
          />
          <input
            type="text"
            name="clientSearch"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por razón social, nombre de fantasía o CUIT"
            autoComplete="off"
            className="w-full bg-surface-low pl-10 pr-3 py-2.5 rounded-lg border border-border-subtle text-sm text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:ring-2 focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10 transition-all"
          />
        </div>

        <div className="mt-3 rounded-lg border border-border-subtle bg-surface-card overflow-hidden">
          <label className="flex items-center gap-2 px-2 py-1.5 bg-surface-low border-b border-border-subtle text-xs font-bold uppercase tracking-wider text-on-surface-muted cursor-pointer">
            <RoundedCheckbox
              size="small"
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected && !allVisibleSelected}
              disabled={selectableVisible.length === 0}
              onChange={toggleAllVisible}
            />
            Seleccionar todos{search.trim() ? ' los filtrados' : ''}
          </label>

          {/* Altura fija: al buscar solo cambia el contenido, no el tamaño del diálogo */}
          <div className="h-80 overflow-y-auto">
            {loading && <p className="px-4 py-6 text-sm text-center text-on-surface-muted">Cargando clientes…</p>}
            {!loading && visibleClients.length === 0 && (
              <p className="px-4 py-6 text-sm text-center text-on-surface-muted">No hay clientes que coincidan con la búsqueda.</p>
            )}
            {!loading && visibleClients.map((client) => {
              const alreadyAssigned = isAlreadyAssigned(client);
              return (
                <label
                  key={client.id}
                  className={`flex items-center gap-2 px-2 py-1.5 border-b border-border-subtle last:border-b-0 ${
                    alreadyAssigned ? 'opacity-60 cursor-default' : 'cursor-pointer hover:bg-surface-low'
                  }`}
                >
                  <RoundedCheckbox
                    size="small"
                    checked={alreadyAssigned || selectedIds.has(client.id)}
                    disabled={alreadyAssigned}
                    onChange={() => toggleClient(client.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-on-surface truncate">{client.razon_social}</p>
                    {client.nombre_fantasia && (
                      <p className="text-xs text-on-surface-muted truncate">{client.nombre_fantasia}</p>
                    )}
                  </div>
                  <span className="shrink-0 max-w-[45%] truncate text-xs text-on-surface-muted">
                    {alreadyAssigned ? 'Ya asignado' : client.lista_precios?.nombre || 'Sin lista'}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Lugar reservado para el aviso/error, así el diálogo no cambia de alto cuando aparecen */}
        <div className="mt-3 min-h-[2rem]">
          {error ? (
            <p className="text-xs font-medium text-red-500">{error}</p>
          ) : changingListCount > 0 && (
            <p className="text-xs font-medium text-amber-500">
              {changingListCount === 1
                ? '1 cliente elegido tiene otra lista asignada y va a pasar a esta.'
                : `${changingListCount} clientes elegidos tienen otra lista asignada y van a pasar a esta.`}
            </p>
          )}
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3 mt-3">
        <SpotlightButton variant="cancel" onClick={onClose} disabled={saving} className="px-5 py-2.5 text-sm">
          Cancelar
        </SpotlightButton>
        <SpotlightButton
          variant="primary"
          onClick={handleAssign}
          disabled={saving || selectedIds.size === 0}
          className="px-5 py-2.5 text-sm"
        >
          {saving
            ? 'Asignando…'
            : selectedIds.size > 0
              ? `Asignar a ${selectedIds.size} cliente${selectedIds.size === 1 ? '' : 's'}`
              : 'Asignar'}
        </SpotlightButton>
        </div>
      </div>
    </Dialog>
  );
};

export default AssignClientsDialog;
