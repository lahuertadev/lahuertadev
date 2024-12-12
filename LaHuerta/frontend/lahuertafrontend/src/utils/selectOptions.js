import axios from 'axios';

export const loadOptions = async (url, mapper) => {
    try {
      const response = await axios.get(url);
      return mapper(response.data);
    } catch (error){
      console.error(`Error al obtener los datos de ${url}: `, error);
      return [];
    }
  }