import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useState } from 'react';
import { useOnline } from '../../app/hooks';
import { useFamilia, useSessao } from '../../app/sessao';
import { useToast } from '../../components/Toast';
import { dbLocal } from '../../data/db-local';
import {
  alterarApelido,
  cancelarConvite,
  criarConvite,
  listarConvitesPendentes,
  removerMembro,
  renomearFamilia,
  sincronizarMembros,
  type Convite,
} from '../../data/repos/familia';
import { mensagemDeErro } from '../../data/supabase';
import { usePwaInstall } from '../../pwa/install';

const linkDoConvite = (token: string) => `${window.location.origin}/convite/${token}`;

function ConviteItem({ c, onCancelar }: { c: Convite; onCancelar: () => void }) {
  const toast = useToast();
  const link = linkDoConvite(c.token);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast('Link copiado');
    } catch {
      toast('Selecione o link e copie manualmente.');
    }
  };
  const compartilhar = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Convite para o Baldinhos', text: 'Entre na nossa conta da família no Baldinhos:', url: link });
        return;
      } catch {
        /* cancelado: cai no copiar */
      }
    }
    await copiar();
  };
  return (
    <div className="item" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
      <input className="inp" readOnly value={link} aria-label="Link do convite" onFocus={(e) => e.target.select()} />
      <div className="item-meta">
        <span>Vale até {new Date(c.expiraEm).toLocaleDateString('pt-BR')} · uso único</span>
      </div>
      <div className="acts-row" style={{ marginTop: 8 }}>
        <button type="button" className="btn small ghost" onClick={onCancelar}>
          Cancelar convite
        </button>
        <div className="grow">
          <button type="button" className="btn small ghost" onClick={() => void copiar()}>
            Copiar link
          </button>
          <button type="button" className="btn small primary" onClick={() => void compartilhar()}>
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
}

/** Família e conta (docs/06 §4.10, RF-03..05). */
export function FamiliaScreen() {
  const familia = useFamilia();
  const { email, sair, recarregarFamilia } = useSessao();
  const online = useOnline();
  const toast = useToast();
  const { podeInstalar, instalar, instalado } = usePwaInstall();
  const membros = useLiveQuery(() => dbLocal.membros.where('familiaId').equals(familia.familiaId).toArray(), [familia.familiaId]);
  const pendentes = useLiveQuery(() => dbLocal.fila.count(), []) ?? 0;
  const [convites, setConvites] = useState<Convite[]>([]);
  const [nomeFamilia, setNomeFamilia] = useState(familia.familiaNome);
  const [apelido, setApelido] = useState(familia.apelido);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const admin = familia.papel === 'admin';

  const carregarConvites = useCallback(async () => {
    if (!admin || !navigator.onLine) return;
    try {
      setConvites(await listarConvitesPendentes(familia.familiaId));
    } catch {
      /* sem conexão: lista fica como está */
    }
  }, [admin, familia.familiaId]);

  useEffect(() => {
    void carregarConvites();
    if (navigator.onLine) void sincronizarMembros(familia.familiaId).catch(() => {});
  }, [carregarConvites, familia.familiaId]);

  const tentar = async (acao: () => Promise<unknown>, ok: string) => {
    if (!online) return toast('Para isso é preciso estar conectado.');
    try {
      await acao();
      toast(ok);
    } catch (e) {
      toast(`Não foi possível: ${mensagemDeErro(e)}`);
    }
  };

  const ativos = (membros ?? []).filter((m) => m.removidoEm === null);

  return (
    <>
      <section className="card form">
        <p className="h2">{familia.familiaNome}</p>
        {admin && (
          <form
            className="field"
            onSubmit={(e) => {
              e.preventDefault();
              if (!nomeFamilia.trim()) return;
              void tentar(async () => {
                await renomearFamilia(familia.familiaId, nomeFamilia);
                await recarregarFamilia();
              }, 'Nome da família salvo');
            }}
          >
            <label htmlFor="nome-familia">Nome da família</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="nome-familia" className="inp" maxLength={60} value={nomeFamilia} onChange={(e) => setNomeFamilia(e.target.value)} />
              <button type="submit" className="btn ghost" disabled={nomeFamilia.trim() === familia.familiaNome}>
                Salvar
              </button>
            </div>
          </form>
        )}
        <form
          className="field"
          onSubmit={(e) => {
            e.preventDefault();
            if (!apelido.trim()) return;
            void tentar(async () => {
              await alterarApelido(familia.familiaId, familia.userId, apelido);
              await Promise.all([recarregarFamilia(), sincronizarMembros(familia.familiaId)]);
            }, 'Apelido salvo');
          }}
        >
          <label htmlFor="apelido">Como você aparece para a família</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input id="apelido" className="inp" maxLength={30} value={apelido} onChange={(e) => setApelido(e.target.value)} />
            <button type="submit" className="btn ghost" disabled={apelido.trim() === familia.apelido}>
              Salvar
            </button>
          </div>
        </form>
      </section>

      <div className="rowhead">
        <p className="h2">Membros</p>
      </div>
      <div className="list">
        {ativos.map((m) => (
          <div key={m.userId} className="item" style={{ gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'center' }}>
            <div>
              <div className="item-name">
                {m.apelido}
                {m.userId === familia.userId && ' (você)'}
              </div>
              <div className="sub">{m.papel === 'admin' ? 'Administrador' : 'Membro'}</div>
            </div>
            {admin && m.userId !== familia.userId && (
              <button
                type="button"
                className={`btn small danger${removendo === m.userId ? ' armed' : ''}`}
                onClick={() => {
                  if (removendo !== m.userId) return setRemovendo(m.userId);
                  setRemovendo(null);
                  void tentar(async () => {
                    await removerMembro(familia.familiaId, m.userId);
                    await sincronizarMembros(familia.familiaId);
                  }, 'Membro removido');
                }}
              >
                {removendo === m.userId ? 'Confirmar remoção' : 'Remover'}
              </button>
            )}
          </div>
        ))}
      </div>

      {admin && (
        <>
          <div className="rowhead">
            <p className="h2">Convites</p>
            <button
              type="button"
              className="btn small primary"
              onClick={() =>
                void tentar(async () => {
                  await criarConvite(familia.familiaId, familia.userId);
                  await carregarConvites();
                }, 'Convite criado. Envie o link para quem vai entrar.')
              }
            >
              Convidar pessoa
            </button>
          </div>
          {convites.length === 0 ? (
            <p className="note">
              Gere um link de convite e envie para a outra pessoa. Ela cria a conta com e-mail e senha e entra direto na família.
            </p>
          ) : (
            <div className="list">
              {convites.map((c) => (
                <ConviteItem
                  key={c.token}
                  c={c}
                  onCancelar={() =>
                    void tentar(async () => {
                      await cancelarConvite(c.token);
                      await carregarConvites();
                    }, 'Convite cancelado')
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      <section className="card form" style={{ gap: 10 }}>
        <p className="sub" style={{ margin: 0 }}>
          Conectado como <b>{email}</b>
        </p>
        {podeInstalar && !instalado && (
          <button type="button" className="btn ghost block" onClick={() => void instalar()}>
            Instalar o app
          </button>
        )}
        {confirmarSaida && pendentes > 0 && (
          <div className="banner warn">
            Há {pendentes} {pendentes === 1 ? 'gasto ainda não enviado' : 'gastos ainda não enviados'}. Conecte-se à internet antes de sair.
          </div>
        )}
        <button
          type="button"
          className={`btn danger block${confirmarSaida ? ' armed' : ''}`}
          onClick={() => {
            if (!confirmarSaida) return setConfirmarSaida(true);
            void sair();
          }}
        >
          {confirmarSaida ? (pendentes > 0 ? 'Sair mesmo assim' : 'Confirmar: sair desta conta') : 'Sair desta conta'}
        </button>
        <p className="note" style={{ textAlign: 'center' }}>
          Baldinhos {__APP_VERSION__}
        </p>
      </section>
    </>
  );
}
