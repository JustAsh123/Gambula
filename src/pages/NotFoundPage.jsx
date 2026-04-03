import Button from '../components/shared/Button';
import GlassPanel from '../components/shared/GlassPanel';

export default function NotFoundPage() {
  return (
    <GlassPanel className="mx-auto max-w-3xl p-8 text-center">
      <p className="section-label">404</p>
      <h2 className="mt-3 text-3xl font-semibold text-white">This cabinet is offline</h2>
      <p className="mt-4 text-sm leading-6 text-gray-300">
        The route you opened does not exist. Head back to the dashboard to pick another game.
      </p>
      <Button
        className="mt-8"
        to="/"
      >
        Back To Dashboard
      </Button>
    </GlassPanel>
  );
}
