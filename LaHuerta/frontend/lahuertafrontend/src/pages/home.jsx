import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import axios from 'axios';
import CakeIcon from '@mui/icons-material/CakeOutlined';
import CelebrationIcon from '@mui/icons-material/CelebrationOutlined';
import AccessCard from '../components/Card';
import AlertsPanel from '../components/AlertsPanel';
import NewsPanel from '../components/NewsPanel';
import { cardOptions } from '../constants/cardOptions';
import { authCelebrationsUrl, newsUrl } from '../constants/urls';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTutorial } from '../context/TutorialContext';
import { extractErrorMessage } from '../utils/errors';

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
  const { showToast } = useToast();
  const { canOfferTutorial, startTutorial } = useTutorial();
  const [celebrations, setCelebrations] = useState([]);
  const [news, setNews] = useState([]);

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

    const loadNews = async () => {
      try {
        const response = await axios.get(newsUrl, { params: { pending: true } });
        if (!cancelled) setNews(response.data);
      } catch {
        if (!cancelled) setNews([]);
      }
    };

    loadCelebrations();
    loadNews();
    return () => { cancelled = true; };
  }, []);

  const handleDismissNews = async (item) => {
    try {
      await axios.post(`${newsUrl}${item.id}/mark-seen/`);
      setNews((current) => current.filter((newsItem) => newsItem.id !== item.id));
      showToast('Novedad marcada como vista');
    } catch (error) {
      showToast(extractErrorMessage(error, 'No se pudo marcar la novedad como vista.'), { variant: 'error' });
    }
  };

  const alerts = celebrations.map((celebration) => {
    const isSelf = user && celebration.user_id === user.id;
    return {
      key: `${celebration.type}-${celebration.user_id}`,
      icon: celebration.type === 'birthday' ? <CakeIcon fontSize="small" /> : <CelebrationIcon fontSize="small" />,
      title: celebration.type === 'birthday' ? 'Cumpleaños' : 'Aniversario en La Huerta',
      message: celebrationMessage(celebration, isSelf),
    };
  });

  const firstName = user?.first_name || user?.username;

  return (
    <div className="container mx-auto flex flex-col items-start px-4 py-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Bienvenido de nuevo</p>
        <h1 className="mt-1 text-2xl font-bold text-on-surface">
          {firstName ? `Hola, ${firstName} 👋` : 'Hola 👋'}
        </h1>
      </div>

      <div className="mt-4 grid w-full content-start grid-flow-row-dense grid-cols-1 gap-2 sm:grid-cols-2 sm:auto-rows-[minmax(64px,auto)] lg:grid-cols-4 lg:auto-rows-[minmax(72px,auto)]">
        <AlertsPanel alerts={alerts} />
        <NewsPanel
          news={news}
          onDismiss={handleDismissNews}
          historyUrl="/news"
          canStartTutorial={canOfferTutorial}
          onStartTutorial={startTutorial}
        />
        {cardOptions.map((card) => (
          <AccessCard
            key={card.url}
            title={card.title}
            description={card.description}
            url={card.url}
            icon={card.icon}
            size={card.size}
          />
        ))}
      </div>

      <Outlet />
    </div>
  );
};

export default Home;
