import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';

// CRA maps *.module.css → identity-obj-proxy (className → string)
// lucide-react SVGs render fine in jsdom

function renderLogin(initialPath = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Login />
    </MemoryRouter>
  );
}

// ── Role selector (initial step) ─────────────────────────────────────────────
describe('Role selector', () => {
  it('renders all three role buttons', () => {
    renderLogin();
    expect(screen.getByText('Driver')).toBeInTheDocument();
    expect(screen.getByText('Fleet Owner')).toBeInTheDocument();
    expect(screen.getByText('Platform Admin')).toBeInTheDocument();
  });

  it('shows brand name', () => {
    renderLogin();
    expect(screen.getByText('MobilityGrid')).toBeInTheDocument();
  });

  it('shows "Sign in" heading', () => {
    renderLogin();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });
});

// ── PIN login step (after role select) ───────────────────────────────────────
describe('PIN login step', () => {
  function goToPinLogin() {
    renderLogin();
    fireEvent.click(screen.getByText('Driver'));
  }

  it('navigates to pin-login step after clicking Driver', () => {
    goToPinLogin();
    expect(screen.getByText('Login as Driver')).toBeInTheDocument();
  });

  it('navigates to pin-login step after clicking Fleet Owner', () => {
    renderLogin();
    fireEvent.click(screen.getByText('Fleet Owner'));
    expect(screen.getByText('Login as Fleet Owner')).toBeInTheDocument();
  });

  it('renders phone and PIN inputs', () => {
    goToPinLogin();
    expect(screen.getByPlaceholderText('10-digit mobile number')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('4–6 digit PIN')).toBeInTheDocument();
  });

  it('submit button is disabled with empty inputs', () => {
    goToPinLogin();
    const btn = screen.getByRole('button', { name: /sign in/i });
    expect(btn).toBeDisabled();
  });

  it('submit button is disabled with incomplete phone (< 10 digits)', async () => {
    goToPinLogin();
    await userEvent.type(screen.getByPlaceholderText('10-digit mobile number'), '98765');
    await userEvent.type(screen.getByPlaceholderText('4–6 digit PIN'), '1234');
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });

  it('submit button enables with 10-digit phone and 4-digit PIN', async () => {
    goToPinLogin();
    await userEvent.type(screen.getByPlaceholderText('10-digit mobile number'), '9876543210');
    await userEvent.type(screen.getByPlaceholderText('4–6 digit PIN'), '1234');
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });

  it('back button returns to role selector', () => {
    goToPinLogin();
    fireEvent.click(screen.getByText(/back/i));
    expect(screen.getByText('Driver')).toBeInTheDocument();
    expect(screen.getByText('Fleet Owner')).toBeInTheDocument();
  });
});

// ── API error handling ────────────────────────────────────────────────────────
describe('Login error handling', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid PIN' }),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows error alert on failed login', async () => {
    renderLogin();
    fireEvent.click(screen.getByText('Driver'));

    await userEvent.type(screen.getByPlaceholderText('10-digit mobile number'), '9876543210');
    await userEvent.type(screen.getByPlaceholderText('4–6 digit PIN'), '1234');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid PIN')).toBeInTheDocument();
    });
  });
});

// ── URL param pre-selection ───────────────────────────────────────────────────
describe('URL param role pre-selection', () => {
  it('pre-selects driver role with ?role=driver', () => {
    renderLogin('/login?role=driver');
    expect(screen.getByText('Login as Driver')).toBeInTheDocument();
  });

  it('pre-selects owner role with ?role=owner', () => {
    renderLogin('/login?role=owner');
    expect(screen.getByText('Login as Fleet Owner')).toBeInTheDocument();
  });

  it('shows owner signup form with ?role=owner&signup=true', () => {
    renderLogin('/login?role=owner&signup=true');
    expect(screen.getByPlaceholderText('e.g. Rajesh Kumar')).toBeInTheDocument();
  });
});
