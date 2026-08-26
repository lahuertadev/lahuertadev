import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import axios from 'axios';
import CakeIcon from '@mui/icons-material/CakeOutlined';
import CelebrationIcon from '@mui/icons-material/CelebrationOutlined';
import ActionAreaCard from '../components/Card';
import { cardOptions } from '../constants/cardOptions';
import { authCelebrationsUrl } from '../constants/urls';
import { useAuth } from '../context/AuthContext';

const celebrationName = (celebration) =>
  [celebration.first_name, celebration.last_name].filter(Boolean).join(' ') || 'un compañero';

const celebrationMessage = (celebration, isSelf) => {
  const { type, days_until: daysUntil, years } = celebration;
  const today = daysUntil === 0;
  const inDays = `en ${daysUntil} día${daysUntil === 1 ? '' : 's'}`;

  if (type === 'birthday') {
    if (isSelf) return today ? '¡Feliz cumpleaños! 🎉' : `Tu cumpleaños es ${inDays} 🎂`;
    const name = celebrationName(celebration);
    return today ? `Hoy es el cumpleaños de ${name}, ¡enviale saludos! 🎉` : `El cumpleaños de ${name} es ${inDays} 🎂`;
  }

  const yearsLabel = `${years} año${years === 1 ? '' : 's'}`;
  if (isSelf) {
    return today
      ? `¡Hoy cumplís ${yearsLabel} en La Huerta! 🎉`
      : `${inDays.charAt(0).toUpperCase()}${inDays.slice(1)} cumplís ${yearsLabel} en La Huerta 🎂`;
  }
  const name = celebrationName(celebration);
  return today
    ? `¡Hoy ${name} cumple ${yearsLabel} en La Huerta! 🎉`
    : `${inDays.charAt(0).toUpperCase()}${inDays.slice(1)}, ${name} cumple ${yearsLabel} en La Huerta 🎂`;
};

const Home = () => {
  const { user } = useAuth();
  const [celebrations, setCelebrations] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadCelebrations = async () => {
      try {
        const response = await axios.get(authCelebrationsUrl, { withCredentials: true });
        if (!cancelled) setCelebrations(response.data);
      } catch {
        if (!cancelled) setCelebrations([]);
      }
    };

    loadCelebrations();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className='container mx-auto h-full items-center justify-center flex flex-col'>
      <h1 className='text-white font-bold text-3xl'>Bienvenido al sistema de Gestión de La Huerta</h1>
      <br></br>
      <br></br>

      {celebrations.length > 0 && (
        <div className="w-full max-w-3xl mb-6 space-y-2">
          {celebrations.map((celebration) => {
            const isSelf = user && celebration.user_id === user.id;
            return (
              <div
                key={`${celebration.type}-${celebration.user_id}`}
                className="flex items-center justify-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-5 py-3"
              >
                {celebration.type === 'birthday' ? (
                  <CakeIcon sx={{ color: '#7e22ce' }} />
                ) : (
                  <CelebrationIcon sx={{ color: '#7e22ce' }} />
                )}
                <p className="text-sm font-semibold text-purple-900">
                  {celebrationMessage(celebration, isSelf)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cardOptions.map((card, index) => (
          <ActionAreaCard
            key={index}
            title={card.title}
            description={card.description}
            url={card.url}
            img={card.img}
            imgDescription={card.imgDescription}
          />
        ))}
      </div>

      <Outlet />
    </div>
  );
};

export default Home;
