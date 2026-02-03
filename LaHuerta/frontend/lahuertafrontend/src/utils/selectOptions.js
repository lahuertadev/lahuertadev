import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

export const loadOptions = async (url, mapper) => {
  try {
    const isOurBackend = typeof url === 'string' && url.startsWith(API_BASE);
    const response = await axios.get(url, { withCredentials: isOurBackend });
    return mapper(response.data);
  } catch (error) {
    console.error(`Error al obtener los datos de ${url}: `, error);
    return [];
  }
};