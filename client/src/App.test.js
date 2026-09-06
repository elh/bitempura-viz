import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import fixtures from '../public/fixtures/test_output.json';
import { getInstanceByDom } from 'echarts';

// Use the real ECharts wrapper and engine with SVG, since jsdom has no canvas.
jest.mock('echarts-for-react', () => {
  const Chart = jest.requireActual('echarts-for-react').default;
  return props => <Chart {...props} opts={{ renderer: 'svg', width: 900, height: 550 }} />;
});

beforeEach(() => {
  window.location.hash = '#/';
  window.scrollTo = jest.fn();
  global.fetch = jest.fn().mockResolvedValue({ status: 200, json: async () => fixtures });
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    measureText: text => ({ width: String(text).length * 8 }),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.REACT_APP_USE_FIXTURES;
});

test('loads API data and renders the test list and Markdown', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'bitempura-viz 🔮' })).toBeInTheDocument();
  expect(await screen.findByRole('link', { name: 'TestRobinhoodExample' })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith('/test_output');
  expect(screen.getByRole('link', { name: 'simple bitemporal kv database↗' }).closest('strong')).not.toBeNull();
});

test('fixture mode renders a real ECharts chart and supports replay and home navigation', async () => {
  process.env.REACT_APP_USE_FIXTURES = 'true';
  const { container } = render(<App />);
  fireEvent.click(await screen.findByRole('link', { name: 'TestRobinhoodExample' }));
  await waitFor(() => expect(container.querySelector('.chart svg')).not.toBeNull());
  const chart = container.querySelector('.chart');
  await waitFor(() => expect(chart.textContent).toContain('Tx Time'));
  expect(chart.textContent).toContain('Valid Time');
  expect(chart.querySelectorAll('path').length).toBeGreaterThan(10);
  fireEvent.click(container.querySelector('.replay-button'));
  expect(container.querySelectorAll('.replay-button').length).toBe(2);
  fireEvent.click(screen.getByText('▶️'));
  expect(container.querySelectorAll('.replay-button').length).toBe(1);
  fireEvent.click(screen.getByRole('link', { name: 'Home' }));
  expect(await screen.findByRole('heading', { name: 'bitempura-viz 🔮' })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/fixtures/test_output.json'));
});

test.each(fixtures.tests)('renders ECharts history for $TestName', async fixture => {
  window.location.hash = '#/tests/' + encodeURIComponent(fixture.TestName);
  const { container } = render(<App />);
  await waitFor(() => {
    const element = container.querySelector('.echarts-for-react');
    expect(element).not.toBeNull();
    const chart = getInstanceByDom(element);
    expect(chart?.getOption()?.series?.[0]?.data).toHaveLength(Object.values(fixture.Histories)[0]?.length || 0);
    expect(element.querySelector('svg')).not.toBeNull();
  });
});

test('interactive mode initializes the Wasm bridge and renders history updates', async () => {
  const history = fixtures.tests.find(test => test.TestName === 'TestRobinhoodExample').Histories;
  const versions = Object.values(history)[0];
  window.bt_Init = jest.fn();
  window.bt_History = jest.fn().mockReturnValue(versions);
  window.bt_OnChange = jest.fn();
  window.location.hash = '#/interactive';
  const { container } = render(<App />);
  await waitFor(() => expect(window.bt_OnChange).toHaveBeenCalled(), { timeout: 2000 });
  expect(window.bt_Init).toHaveBeenCalledTimes(1);
  act(() => window.bt_OnChange.mock.calls[0][0]('A'));
  await waitFor(() => {
    const chart = getInstanceByDom(container.querySelector('.echarts-for-react'));
    expect(chart.getOption().series[0].data).toHaveLength(versions.length);
  });
  expect(window.bt_History).toHaveBeenCalledWith('A');
  delete window.bt_Init;
  delete window.bt_History;
  delete window.bt_OnChange;
});
