import React, { useEffect, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

import CustomInput from '../../../components/Input';
import { loadOptions } from '../../../utils/selectOptions';
import {
  productUrl,
  categoryUrl,
  containerTypeUrl,
  unitTypeUrl,
} from '../../../constants/urls';
import Inventory2Icon from '@mui/icons-material/Inventory2Outlined';
import StraightenIcon from '@mui/icons-material/StraightenOutlined';

// ── Estilos reutilizables ─────────────────────────────────────────────────────
const inputCls = (hasError) =>
  `w-full bg-surface-low px-3 py-2.5 rounded-lg border text-sm text-on-surface placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? 'border-red-400 ring-2 ring-red-100'
      : 'border-border-subtle focus:border-blue-lahuerta/40 focus:ring-blue-lahuerta/10'
  }`;

const labelCls = 'block text-[0.6875rem] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5';

const SectionCard = ({ icon, title, children, cols = 3 }) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2 px-1">
      <span className="text-blue-lahuerta">{icon}</span>
      <h2 className="text-base font-semibold text-on-surface">{title}</h2>
    </div>
    <div className={`bg-surface-card p-6 rounded-xl shadow-sm border border-border-subtle grid grid-cols-1 md:grid-cols-${cols} gap-6`}>
      {children}
    </div>
  </section>
);

const FieldError = ({ error, touched }) =>
  touched && error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null;

// ── Componente principal ──────────────────────────────────────────────────────
const ProductForm = () => {
  const [selectOptions, setSelectOptions] = useState({
    categories: [],
    containerTypes: [],
    unitTypes: [],
  });

  const [initialValues, setInitialValues] = useState({
    description: '',
    category: '',
    containerType: '',
    unitType: '',
    unitsPerBundle: '',
    approximateWeight: '',
  });

  const [itemToEdit] = useState(initialValues || null);

  const { id } = useParams();
  const navigate = useNavigate();

  //* Carga inicial de selects
  const loadInitialOptions = async () => {
    const categories = await loadOptions(categoryUrl, (data) =>
      data.map((item) => ({ name: item.descripcion, value: item.id }))
    );

    const containerTypes = await loadOptions(containerTypeUrl, (data) =>
      data.map((item) => ({ name: item.descripcion, value: item.id }))
    );

    const unitTypes = await loadOptions(unitTypeUrl, (data) =>
      data.map((item) => ({
        name: item.descripcion,
        value: item.id,
        measurementType: item.tipo_medicion,
      }))
    );

    setSelectOptions({
      categories,
      containerTypes,
      unitTypes,
    });
  };

  //* Trae producto para edición
  const fetchItemToEdit = async () => {
    try {
      const response = await axios.get(`${productUrl}${id}/`);
      const data = response.data;

      setInitialValues({
        description: data.descripcion || '',
        category: data.categoria
          ? { name: data.categoria.descripcion, value: data.categoria.id }
          : '',
        containerType: data.tipo_contenedor
          ? { name: data.tipo_contenedor.descripcion, value: data.tipo_contenedor.id }
          : '',
        unitType: data.tipo_unidad
          ? {
            name: data.tipo_unidad.descripcion,
            value: data.tipo_unidad.id,
            measurementType: data.tipo_unidad.tipo_medicion
          }
          : '',
        unitsPerBundle: data.cantidad_por_bulto ?? '',
        approximateWeight: data.peso_aproximado ?? '',
      });
    } catch (error) {
      console.error('Error al cargar el producto para edición:', error);
    }
  };

  //* Validaciones
  const validationSchema = Yup.object({
    description: Yup.string()
      .required('La descripción es obligatoria')
      .max(30, 'La descripción no puede superar los 30 caracteres'),
    category: Yup.object().required('La categoría es obligatoria'),
    containerType: Yup.object().required('El tipo de contenedor es obligatorio'),
    unitType: Yup.object().required('El tipo de unidad es obligatorio'),
    unitsPerBundle: Yup.number()
      .transform((value, originalValue) => (originalValue === '' ? null : value))
      .nullable()
      .when('unitType', (unitType, schema) => {
        const measurementType = unitType?.measurementType;

        if (measurementType === 'CANTIDAD') {
          return schema
          .typeError('La cantidad por bulto debe ser numérica')
          .integer('La cantidad por bulto debe ser un número entero')
          .positive('La cantidad por bulto debe ser mayor a 0')
          .required('La cantidad por bulto es obligatoria');
        }

        return schema.notRequired();
      }),

    approximateWeight: Yup.number()
      .transform((value, originalValue) => (originalValue === '' ? null : value))
      .nullable()
      .when('unitType', (unitType, schema) => {
        const measurementType = unitType?.measurementType;

        if (measurementType === 'PESO') {
          return schema
            .typeError('El peso aproximado debe ser numérico')
            .positive('El peso aproximado debe ser mayor a 0')
            .required('El peso aproximado es obligatorio');
        }

        return schema.notRequired();
      }),
  });

  //* Mapeo al formato esperado por backend
  const mapFormDataToBackend = (values) => {
    return {
      descripcion: values.description,
      categoria: values.category.value,
      tipo_contenedor: values.containerType.value,
      tipo_unidad: values.unitType.value,
      cantidad_por_bulto:
        values.unitsPerBundle === '' || values.unitsPerBundle === null
        ? null
        : Number(values.unitsPerBundle),
      peso_aproximado:
        values.approximateWeight === '' || values.approximateWeight === null
        ? null
        : Number(values.approximateWeight),
    };
  };

  //* Submit
  const handleSubmit = async (values) => {
    const mappedValues = mapFormDataToBackend(values);

    try {
      if (itemToEdit && id) {
        await axios.put(`${productUrl}${id}/`, mappedValues);
      } else if (productUrl) {
        await axios.post(productUrl, mappedValues);
      }

      navigate('/product');
    } catch (error) {
      console.error('Error enviando el formulario:', error);
    }
  };

  //* Carga del formulario
  useEffect(() => {
    const loadFormOptions = async () => {
      await loadInitialOptions();

      if (id) {
        await fetchItemToEdit();
      }
    };

    loadFormOptions();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      enableReinitialize
      onSubmit={handleSubmit}
    >
      {({ values, errors, touched, handleChange, setFieldValue }) => {
        const measurementType = values.unitType?.measurementType;
        const isWeightBased = measurementType === 'PESO';
        const requiresUnitsPerBundle = measurementType === 'CANTIDAD';

        return (
          <Form className="w-full max-w-5xl mx-auto space-y-8 pb-12">

            {/* Breadcrumbs */}
            <nav className="flex items-center flex-wrap gap-2 text-sm font-medium text-on-surface-muted">
              <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/')}>Inicio</span>
              <span className="text-xs">›</span>
              <span className="whitespace-nowrap hover:text-accent cursor-pointer transition-colors" onClick={() => navigate('/product')}>Productos</span>
              <span className="text-xs">›</span>
              <span className="text-on-surface font-semibold">{id ? 'Editar Producto' : 'Nuevo Producto'}</span>
            </nav>

            {/* 1. Información General */}
            <SectionCard icon={<Inventory2Icon sx={{ fontSize: 20 }} />} title="Información General" cols={2}>
              <div className="md:col-span-2">
                <Field
                  as={CustomInput}
                  label="Descripción *"
                  name="description"
                  onChange={handleChange}
                  helperText={touched.description ? errors.description : ''}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Categoría *</label>
                <select
                  name="category"
                  value={values.category?.value || ''}
                  onChange={(e) => {
                    const selected = selectOptions.categories.find(o => String(o.value) === e.target.value) || null;
                    setFieldValue('category', selected);
                  }}
                  className={inputCls(touched.category && errors.category)}
                >
                  <option value="">Seleccionar...</option>
                  {selectOptions.categories.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.name}</option>
                  ))}
                </select>
                <FieldError error={errors.category} touched={touched.category} />
              </div>
            </SectionCard>

            {/* 2. Presentación y Medidas */}
            <SectionCard icon={<StraightenIcon sx={{ fontSize: 20 }} />} title="Presentación y Medidas">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Tipo de contenedor *</label>
                <select
                  name="containerType"
                  value={values.containerType?.value || ''}
                  onChange={(e) => {
                    const selected = selectOptions.containerTypes.find(o => String(o.value) === e.target.value) || null;
                    setFieldValue('containerType', selected);
                  }}
                  className={inputCls(touched.containerType && errors.containerType)}
                >
                  <option value="">Seleccionar...</option>
                  {selectOptions.containerTypes.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.name}</option>
                  ))}
                </select>
                <FieldError error={errors.containerType} touched={touched.containerType} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Tipo de unidad *</label>
                <select
                  name="unitType"
                  value={values.unitType?.value || ''}
                  onChange={(e) => {
                    const selected = selectOptions.unitTypes.find(o => String(o.value) === e.target.value) || null;
                    setFieldValue('unitType', selected);

                    const selectedMeasurementType = selected?.measurementType;
                    if (selectedMeasurementType === 'PESO') {
                      setFieldValue('unitsPerBundle', '');
                    }
                    if (selectedMeasurementType === 'CANTIDAD') {
                      setFieldValue('approximateWeight', '');
                    }
                  }}
                  className={inputCls(touched.unitType && errors.unitType)}
                >
                  <option value="">Seleccionar...</option>
                  {selectOptions.unitTypes.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.name}</option>
                  ))}
                </select>
                <FieldError error={errors.unitType} touched={touched.unitType} />
              </div>
              {requiresUnitsPerBundle && (
                <Field
                  as={CustomInput}
                  label="Cantidad por bulto *"
                  name="unitsPerBundle"
                  type="number"
                  onChange={handleChange}
                  helperText={touched.unitsPerBundle ? errors.unitsPerBundle : ''}
                />
              )}
              {isWeightBased && (
                <Field
                  as={CustomInput}
                  label="Peso aproximado *"
                  name="approximateWeight"
                  type="number"
                  onChange={handleChange}
                  helperText={touched.approximateWeight ? errors.approximateWeight : ''}
                />
              )}
            </SectionCard>

            {/* Action Bar */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => navigate('/product')}
                className="px-6 py-2.5 text-sm font-semibold text-on-surface-muted border border-border-subtle rounded-lg hover:border-red-400 hover:text-red-500 hover:bg-red-50 hover:font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-8 py-2.5 bg-blue-lahuerta text-white font-bold text-sm rounded-lg shadow-sm hover:bg-blue-lahuerta/90 active:scale-[0.98] transition-all"
              >
                {id ? 'Guardar cambios' : 'Registrar Producto'}
              </button>
            </div>

          </Form>
        );
      }}
    </Formik>
  );
};

export default ProductForm;
