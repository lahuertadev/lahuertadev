import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PeriodNavigator from './PeriodNavigator';

const TODAY = '2026-11-25';

const renderNavigator = (props = {}) => {
  const onChange = jest.fn();
  render(<PeriodNavigator period="mes" date={TODAY} today={TODAY} onChange={onChange} {...props} />);
  return onChange;
};

describe('PeriodNavigator', () => {
  it('muestra el período elegido', () => {
    renderNavigator();
    expect(screen.getByText('Noviembre 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mes' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('la semana se ve con su lunes y su domingo', () => {
    renderNavigator({ period: 'semana' });
    expect(screen.getByText('23/11 – 29/11')).toBeInTheDocument();
  });

  it('al cambiar el tipo de período arranca en el de hoy', () => {
    const onChange = renderNavigator({ date: '2026-08-01' });
    fireEvent.click(screen.getByRole('button', { name: 'Semana' }));
    expect(onChange).toHaveBeenCalledWith({ period: 'semana', date: TODAY });
  });

  it('la flecha anterior va al mes anterior', () => {
    const onChange = renderNavigator();
    fireEvent.click(screen.getByRole('button', { name: 'Período anterior' }));
    expect(onChange).toHaveBeenCalledWith({ period: 'mes', date: '2026-10-01' });
  });

  it('no deja avanzar más allá del período de hoy', () => {
    renderNavigator();
    expect(screen.getByRole('button', { name: 'Período siguiente' })).toBeDisabled();
  });

  it('desde un período pasado avanza, sin pasarse de hoy', () => {
    const onChange = renderNavigator({ period: 'semana', date: '2026-11-20' });
    fireEvent.click(screen.getByRole('button', { name: 'Período siguiente' }));
    expect(onChange).toHaveBeenCalledWith({ period: 'semana', date: TODAY });
  });
});
