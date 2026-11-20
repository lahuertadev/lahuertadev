import React from 'react';
import { act, render } from '@testing-library/react';
import Toast, { DEFAULT_DURATIONS } from '.';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const closesAfter = (props) => {
  const onClose = jest.fn();
  render(<Toast open message="Mensaje" onClose={onClose} {...props} />);
  return onClose;
};

test('un error dura 8 segundos, para que se llegue a leer', () => {
  const onClose = closesAfter({ variant: 'error' });

  act(() => { jest.advanceTimersByTime(DEFAULT_DURATIONS.error - 1); });
  expect(onClose).not.toHaveBeenCalled();
  act(() => { jest.advanceTimersByTime(1); });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('un mensaje de éxito dura 4 segundos', () => {
  const onClose = closesAfter({ variant: 'success' });

  act(() => { jest.advanceTimersByTime(DEFAULT_DURATIONS.success); });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('una duración explícita se respeta, y 0 no lo cierra', () => {
  const onClose = closesAfter({ duration: 2000 });
  act(() => { jest.advanceTimersByTime(2000); });
  expect(onClose).toHaveBeenCalledTimes(1);

  const neverCloses = closesAfter({ duration: 0 });
  act(() => { jest.advanceTimersByTime(60000); });
  expect(neverCloses).not.toHaveBeenCalled();
});
