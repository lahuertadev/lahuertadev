import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeOutlined';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import BackButton from '../../components/BackButton';
import SpotlightButton from '../../components/SpotlightButton';
import { breadcrumbsMap } from '../../constants/breadcrumbs';
import { NEWS_FILTERS } from '../../constants/news';
import { newsUrl } from '../../constants/urls';
import { formatDate } from '../../utils/date';
import { matchesNewsFilter } from '../../utils/news';

const StatusChip = ({ isCurrent }) => (
  isCurrent ? (
    <span className="rounded-full bg-news-accent/15 px-2 py-0.5 text-[11px] font-bold text-news-accent">Vigente</span>
  ) : (
    <span className="rounded-full bg-on-surface-muted/15 px-2 py-0.5 text-[11px] font-bold text-on-surface-muted">Vencida</span>
  )
);

// Doble check como en WhatsApp: azul si la vio, gris si todavía no.
const SeenChip = ({ seen }) => (
  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${seen ? 'text-accent' : 'text-on-surface-muted'}`}>
    <DoneAllIcon sx={{ fontSize: 16 }} />
    {seen ? 'Vista' : 'No vista'}
  </span>
);

/**
 * Historial de novedades del usuario ("Ver todas las novedades" del Inicio): vistas y no vistas,
 * vigentes y vencidas. Solo consulta; marcar como vista se hace desde el Inicio.
 */
const NewsHistory = () => {
  const navigate = useNavigate();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await axios.get(newsUrl);
        setNews(response.data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  const filteredNews = news.filter((item) => matchesNewsFilter(item, filter));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-4">
      <div className="flex items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-on-surface-muted">
          {breadcrumbsMap['/news'].map((crumb, index) => (
            <React.Fragment key={crumb.label}>
              {index > 0 && <span className="text-xs">›</span>}
              {crumb.path ? (
                <span className="cursor-pointer whitespace-nowrap transition-colors hover:text-accent" onClick={() => navigate(crumb.path)}>
                  {crumb.label}
                </span>
              ) : (
                <span className="whitespace-nowrap font-semibold text-on-surface">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
        <BackButton onClick={() => navigate('/')} className="shrink-0 px-5 py-2.5 text-sm" />
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-on-surface">Todas las novedades</h2>
        <p className="mt-1 text-sm text-on-surface-muted">Historial de cambios de la plataforma, vigentes y vencidos.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {NEWS_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                filter === option.value
                  ? 'border-news-accent bg-news-accent/15 text-news-accent'
                  : 'border-border-subtle bg-surface-card text-on-surface-muted hover:border-news-accent/50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-red-500">Error al cargar las novedades.</p>
      )}

      {!loading && !error && filteredNews.length === 0 && (
        <p className="text-center text-sm text-on-surface-muted">No hay novedades para mostrar.</p>
      )}

      {!loading && !error && filteredNews.length > 0 && (
        <ul className="flex flex-col gap-2">
          {filteredNews.map((item) => (
            <li
              key={item.id}
              className={`flex gap-3 rounded-2xl border border-border-subtle bg-surface-card p-4 ${item.is_current ? '' : 'opacity-80'}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  item.seen ? 'bg-on-surface-muted/10 text-on-surface-muted' : 'bg-news-accent/15 text-news-accent'
                }`}
              >
                <AutoAwesomeIcon fontSize="small" />
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                  <p className="text-sm font-bold text-on-surface">{item.titulo}</p>
                  <p className="shrink-0 text-xs text-on-surface-muted">
                    {formatDate(item.fecha_publicacion)}
                    {item.pantalla_nombre && ` · ${item.pantalla_nombre}`}
                  </p>
                </div>

                <p className="text-sm text-on-surface-muted">{item.descripcion}</p>

                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip isCurrent={item.is_current} />
                    <SeenChip seen={item.seen} />
                  </div>
                  {item.pantalla_url && (
                    <SpotlightButton
                      variant="newsOutline"
                      onClick={() => navigate(item.pantalla_url)}
                      className="w-full px-3 py-1.5 text-sm sm:w-auto"
                    >
                      Ir a {item.pantalla_nombre || 'la pantalla'}
                    </SpotlightButton>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NewsHistory;
