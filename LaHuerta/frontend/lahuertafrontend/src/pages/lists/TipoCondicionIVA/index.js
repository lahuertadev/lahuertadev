import { ConditionIvaTypeUrl } from '../../../constants/urls';
import GenericList from '../../../components/List';
import { useNavigate } from 'react-router-dom';

const mapIvaConditionData = (data) => {
  const list = Array.isArray(data) ? data : [];
  
  return list.map(item => ({
    id: item.id,
    descripcion: item.descripcion,
  }));
};

const data = {
  title: 'Condiciones de IVA',
  fetchUrl: {
    baseUrl: ConditionIvaTypeUrl,
    createUrl: '/condition-iva-type/create',    
    editUrl: '/condition-iva-type/edit',
  },
  columns: [
    { field: 'descripcion', headerName: 'Descripción', flex: 1 },
  ],
  mapData: mapIvaConditionData,
  newLabelText: 'condición IVA',
};

const ConditionIvaTypeList = () => {
  const navigate = useNavigate();

  const handleAdd = () => {
    navigate('/condition-iva-type/create');
  };

  return (
    <GenericList
      data={data}
      onAdd={handleAdd}
    />
  );
};

export default ConditionIvaTypeList;
