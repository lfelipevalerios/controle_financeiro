import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { textos } from '../app/textos';
import { useToast } from '../components/Toast';
import { dbLocal, gravarMeta } from '../data/db-local';
import { usePwaInstall } from './install';

/** Faixa "Nova versão disponível" (RF-42). Nunca recarrega com um formulário aberto. */
export function UpdateBanner({ formularioAberto }: { formularioAberto: boolean }) {
  const toast = useToast();
  const {
    needRefresh: [precisaAtualizar],
    offlineReady: [prontoOffline, setProntoOffline],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      if (!registro) return;
      // procura nova versão a cada 60 minutos e ao voltar ao app
      setInterval(() => void registro.update(), 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registro.update();
      });
    },
  });

  useEffect(() => {
    if (prontoOffline) {
      toast('O app já funciona sem internet.');
      setProntoOffline(false);
    }
  }, [prontoOffline, setProntoOffline, toast]);

  if (!precisaAtualizar || formularioAberto) return null;
  return (
    <div className="banner" role="status">
      <b>{textos.update.faixa}</b>
      <div className="acts">
        <button type="button" className="btn small primary" onClick={() => void updateServiceWorker(true)}>
          {textos.update.botao}
        </button>
      </div>
    </div>
  );
}

/** Cartão de instalação (RF-40): na primeira semana, depois do terceiro lançamento, uma vez só. */
export function InstallCard() {
  const { podeInstalar, instalado, instalar } = usePwaInstall();
  const meta = useLiveQuery(async () => {
    const [dispensado, primeiroUso] = await Promise.all([dbLocal.meta.get('installDispensado'), dbLocal.meta.get('primeiroUso')]);
    return { dispensado: Boolean(dispensado?.valor), primeiroUso: primeiroUso?.valor as number | undefined };
  }, []);
  const lancamentosMeus = useLiveQuery(() => dbLocal.lancamentos.count(), []) ?? 0;
  const [agora] = useState(() => Date.now());

  useEffect(() => {
    if (meta && meta.primeiroUso === undefined) void gravarMeta('primeiroUso', Date.now());
  }, [meta]);

  if (!meta || meta.dispensado || instalado || !podeInstalar) return null;
  const naPrimeiraSemana = !meta.primeiroUso || agora - meta.primeiroUso < 7 * 24 * 3600 * 1000;
  if (!naPrimeiraSemana || lancamentosMeus < 3) return null;

  return (
    <div className="banner">
      <div>
        <b>{textos.install.titulo}</b>
        <br />
        {textos.install.texto}
      </div>
      <div className="acts">
        <button type="button" className="btn small primary" onClick={() => void instalar()}>
          Instalar
        </button>
        <button type="button" className="btn small ghost" onClick={() => void gravarMeta('installDispensado', true)}>
          Agora não
        </button>
      </div>
    </div>
  );
}
