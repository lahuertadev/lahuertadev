import React, { useState } from 'react';
import axios from 'axios';
import { authUsersUrl } from '../../../constants/urls';
import { getColumns } from '../../../constants/grid/Usuario';
import { formatDate } from '../../../utils/date';
import { useAuth } from '../../../context/AuthContext';
import GenericList from '../../../components/List';
import Toast from '../../../components/Toast';

const mapUserData = (data) => {
  const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
  return list.map((user) => ({
    id: user.id,
    name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
    email: user.email,
    role: user.role,
    active: user.is_active,
    createdAt: formatDate(user.date_joined),
  }));
};

const UsersList = () => {
  const { user: currentUser } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '' });

  const showError = (err) => {
    setToast({ open: true, message: err.message || 'Ocurrió un error, por favor intentá de nuevo.' });
  };

  const handleToggleActive = async (id) => {
    setBusyId(id);
    try {
      await axios.patch(`${authUsersUrl}${id}/toggle-active/`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showError(err);
    } finally {
      setBusyId(null);
    }
  };

  const handleChangeRole = async (id, role) => {
    setBusyId(id);
    try {
      await axios.patch(`${authUsersUrl}${id}/role/`, { role });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showError(err);
    } finally {
      setBusyId(null);
    }
  };

  const data = {
    title: 'Usuarios',
    fetchUrl: { baseUrl: authUsersUrl },
    columns: getColumns({
      onToggleActive: handleToggleActive,
      onChangeRole: handleChangeRole,
      currentUserId: currentUser?.id,
      busyId,
    }),
    mapData: mapUserData,
    showAdd: false,
    showEdit: false,
    showDelete: false,
    multiSelect: false,
  };

  return (
    <>
      <Toast open={toast.open} message={toast.message} onClose={() => setToast({ open: false, message: '' })} />
      <GenericList key={refreshKey} data={data} />
    </>
  );
};

export default UsersList;
