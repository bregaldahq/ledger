import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, AlertCircle, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';

interface DropzoneProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  loadingMessage?: string;
  error: string | null;
  onClearError: () => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFileSelected,
  isLoading,
  loadingMessage = 'Conferindo duplicatas a pagar e amarrando créditos e débitos...',
  error,
  onClearError,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isLoading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validarEEnviar(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validarEEnviar(file);
    }
  };

  const validarEEnviar = (file: File) => {
    onClearError();
    const nome = file.name.toLowerCase();
    if (!nome.endsWith('.xls') && !nome.endsWith('.xlsx')) {
      alert('Por favor, selecione um arquivo Excel (.xls ou .xlsx).');
      return;
    }
    onFileSelected(file);
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '720px',
        margin: '0 auto',
        padding: 'var(--space-4) var(--space-2)',
      }}
    >
      {/* Estado de Erro Acolhedor */}
      {error && (
        <div
          className="animate-fade-in"
          style={{
            marginBottom: 'var(--space-3)',
            backgroundColor: '#FEF2F2',
            border: '1px solid var(--red-border)',
            borderRadius: 'var(--radius-card)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
          }}
        >
          <div
            style={{
              padding: '0.375rem',
              backgroundColor: 'var(--red-subtle)',
              borderRadius: '50%',
              color: 'var(--red-lapis)',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: '#991B1B',
                marginBottom: '0.25rem',
              }}
            >
              Não conseguimos ler esta planilha
            </h3>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#7F1D1D',
                lineHeight: 1.5,
                marginBottom: '0.75rem',
              }}
            >
              {error}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onClearError}
                className="btn-secondary"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8125rem',
                  minHeight: '32px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <RefreshCw size={13} />
                <span>Tentar novamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Caixa de Upload Drag & Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        style={{
          backgroundColor: isDragOver ? 'var(--purple-subtle)' : 'var(--bg-surface)',
          border: isDragOver
            ? '2px dashed var(--purple)'
            : '2px dashed color-mix(in srgb, var(--purple) 30%, transparent)',
          borderRadius: 'var(--radius-card)',
          padding: 'clamp(2rem, 5vw, 3.5rem) 2rem',
          textAlign: 'center',
          cursor: isLoading ? 'wait' : 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isDragOver
            ? '0 8px 30px rgba(75, 46, 131, 0.12)'
            : '0 4px 20px rgba(42, 33, 64, 0.04)',
          position: 'relative',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xls,.xlsx"
          onChange={handleFileInput}
          style={{ display: 'none' }}
          disabled={isLoading}
        />

        {isLoading ? (
          /* Estado de Carregamento com Mensagem Acolhedora */
          <div
            className="animate-fade-in"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--yellow-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                border: '2px solid var(--yellow)',
              }}
            >
              <FileSpreadsheet
                size={32}
                color="var(--purple)"
                className="animate-spin"
                style={{ animationDuration: '3s' }}
              />
            </div>

            <h3
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--ink)',
                marginBottom: '0.5rem',
              }}
            >
              Processando sua planilha...
            </h3>

            <p
              style={{
                fontSize: '0.9375rem',
                color: 'var(--text-secondary)',
                maxWidth: '460px',
                lineHeight: 1.6,
                marginBottom: '1.25rem',
              }}
            >
              {loadingMessage}
            </p>

            <div
              className="badge"
              style={{
                backgroundColor: 'var(--purple-subtle)',
                color: 'var(--purple)',
                border: '1px solid color-mix(in srgb, var(--purple) 25%, transparent)',
                fontSize: '0.75rem',
              }}
            >
              <span
                className="animate-spin"
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  border: '2px solid var(--purple)',
                  borderTopColor: 'transparent',
                  display: 'inline-block',
                }}
              />
              Calculando prazos e amarrações 1:1
            </div>
          </div>
        ) : (
          /* Estado de Espera / Seleção */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: isDragOver ? 'var(--yellow)' : 'var(--purple-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
                transition: 'all 0.2s ease',
              }}
            >
              <UploadCloud
                size={36}
                color={isDragOver ? 'var(--ink)' : 'var(--purple)'}
              />
            </div>

            <h2
              style={{
                fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
                fontWeight: 600,
                color: 'var(--ink)',
                marginBottom: '0.5rem',
                letterSpacing: '-0.01em',
              }}
            >
              Arraste a planilha do Razão aqui
            </h2>

            <p
              style={{
                fontSize: '0.9375rem',
                color: 'var(--text-secondary)',
                maxWidth: '440px',
                lineHeight: 1.5,
                marginBottom: '1.5rem',
              }}
            >
              ou clique para selecionar o arquivo no seu computador
            </p>

            <button
              type="button"
              className="btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              style={{
                padding: '0.75rem 1.75rem',
                fontSize: '0.9375rem',
                boxShadow: '0 2px 8px rgba(75, 46, 131, 0.25)',
              }}
            >
              <FileSpreadsheet size={16} />
              <span>Escolher Planilha Excel</span>
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginTop: '1.75rem',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <span
                className="technical-label"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '3px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Formatos: .xls e .xlsx
              </span>
              <span
                className="technical-label"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '3px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Até 50 MB
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Dicas e Garantia Zero-Storage */}
      <div
        style={{
          marginTop: 'var(--space-3)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-card)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              padding: '0.35rem',
              backgroundColor: 'var(--green-subtle)',
              borderRadius: '50%',
              color: 'var(--green)',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <div
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--ink)',
                marginBottom: '0.15rem',
              }}
            >
              Privacidade Zero-Storage
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
              }}
            >
              Sua planilha é conferida exclusivamente na memória RAM e descartada imediatamente. Nenhum dado contábil fica salvo na nuvem.
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-card)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              padding: '0.35rem',
              backgroundColor: 'var(--yellow-subtle)',
              borderRadius: '50%',
              color: '#B45309',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--ink)',
                marginBottom: '0.15rem',
              }}
            >
              Compatível com Sistemas Contábeis
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
              }}
            >
              Pronto para arquivos exportados do Domínio Sistemas, Questor, Totvs, SCI e formatos padrão do Razão Contábil.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
