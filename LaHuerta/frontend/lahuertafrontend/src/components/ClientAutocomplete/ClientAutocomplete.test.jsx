import { filterClients } from '.';

const CLIENTS = [
  { id: 3, cuit: '20111111112', razon_social: 'Verdulería Ana', nombre_fantasia: 'La Esquina' },
  { id: 4, cuit: '30222222223', razon_social: 'Frutería Beto', nombre_fantasia: '' },
];
const search = (inputValue) => filterClients(CLIENTS, { inputValue }).map((client) => client.id);

test('sin texto muestra todos los clientes', () => {
  expect(search('')).toEqual([3, 4]);
});

test('busca por razón social sin distinguir mayúsculas ni acentos', () => {
  expect(search('VERDULERIA')).toEqual([3]);
  expect(search('fruteria')).toEqual([4]);
});

test('busca por nombre de fantasía', () => {
  expect(search('esquina')).toEqual([3]);
});

test('busca por CUIT con o sin guiones', () => {
  expect(search('20111111112')).toEqual([3]);
  expect(search('30-22222222')).toEqual([4]);
});

test('sin coincidencias no devuelve ninguno', () => {
  expect(search('kona')).toEqual([]);
});
