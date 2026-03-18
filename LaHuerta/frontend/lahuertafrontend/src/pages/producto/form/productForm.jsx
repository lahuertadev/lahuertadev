import React, { useEffect, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

import CustomInput from '../../../components/Input';
import BasicSelect from '../../../components/Select';
import IconLabelButtons from '../../../components/Button';
import { loadOptions } from '../../../utils/selectOptions';
import {
  productUrl,
  categoryUrl,
  containerTypeUrl,
  unitTypeUrl,
} from '../../../constants/urls';

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
        measurementType: item.tipo_medicion}))
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
          <div className="min-h-screen flex items-center justify-center bg-transparent flex-1">
            <Form className="bg-white p-8 rounded-lg shadow-lg w-full max-w-3xl space-y-8">
              {/* Datos del producto */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold border-b-2 border-black pb-2">
                  Datos del producto
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <Field
                    as={CustomInput}
                    label="Descripción"
                    name="description"
                    required
                    className="col-span-2"
                    onChange={handleChange}
                  />

                  <BasicSelect
                    label="Categoría"
                    name="category"
                    value={values.category}
                    options={selectOptions.categories}
                    onChange={handleChange}
                  />

                  <BasicSelect
                    label="Tipo de contenedor"
                    name="containerType"
                    value={values.containerType}
                    options={selectOptions.containerTypes}
                    onChange={handleChange}
                  />

                  <BasicSelect
                    label="Tipo de unidad"
                    name="unitType"
                    value={values.unitType}
                    options={selectOptions.unitTypes}
                    onChange={(event) => {
                      handleChange(event);

                      const selectedUnitType = event.target.value;
                      const selectedMeasurementType = selectedUnitType?.measurementType;

                      if (selectedMeasurementType === 'PESO') {
                        setFieldValue('unitsPerBundle', '');
                      }

                      if (selectedMeasurementType === 'CANTIDAD') {
                        setFieldValue('approximateWeight', '');
                      }
                    }}
                  />
                  {requiresUnitsPerBundle && (
                  <Field
                    as={CustomInput}
                    label="Cantidad por bulto"
                    name="unitsPerBundle"
                    type="number"
                    required={requiresUnitsPerBundle}
                    onChange={handleChange}
                  />
                  )}
                  {isWeightBased && (
                  <Field
                    as={CustomInput}
                    label="Peso aproximado"
                    name="approximateWeight"
                    type="number"
                    required={isWeightBased}
                    onChange={handleChange}
                  />
                  )}
                </div>
              </div>

              {/* Botón submit */}
              <div className="mt-8 flex justify-center">
                <IconLabelButtons
                  label="Guardar"
                  variant="contained"
                  color="primary"
                  size="large"
                  type="submit"
                />
              </div>

              {/* Errores */}
              {Object.keys(errors).map((key) =>
                touched[key] && errors[key] ? (
                  <div key={key} className="text-red-500 text-sm mt-2">
                    {typeof errors[key] === 'string' ? errors[key] : 'Campo inválido'}
                  </div>
                ) : null
              )}
            </Form>
          </div>
        );
      }}
    </Formik>
  );
};

export default ProductForm;