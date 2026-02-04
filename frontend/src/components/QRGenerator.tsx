import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import '../styles/QRGenerator.css';

interface QRGeneratorProps {
  projectId: string;
  onClose: () => void;
}

const QRGenerator: React.FC<QRGeneratorProps> = ({ projectId, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  
  // URL del historial del proyecto
  const historyUrl = `https://soporte-frontend-ghp.vercel.app/project/${projectId}/history`;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - Proyecto ${projectId}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20mm;
              background: white;
            }
            
            .qr-print-card {
              max-width: 100mm;
              margin: 0 auto;
              border: 2px solid #10b981;
              border-radius: 12px;
              padding: 20px;
              background: white;
            }
            
            .qr-header {
              text-align: center;
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #10b981;
            }
            
            .qr-logo {
              width: 50px;
              height: 50px;
              background: #10b981;
              color: white;
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 20px;
              margin: 0 auto 10px;
            }
            
            .qr-header h1 {
              font-size: 18px;
              color: #1f2937;
              margin-bottom: 5px;
            }
            
            .qr-header p {
              font-size: 12px;
              color: #6b7280;
            }
            
            .qr-code-container {
              text-align: center;
              padding: 20px;
              background: #f9fafb;
              border-radius: 8px;
              margin-bottom: 15px;
            }
            
            .qr-code-container svg {
              display: block;
              margin: 0 auto;
            }
            
            .project-id {
              text-align: center;
              padding: 10px;
              background: #ecfdf5;
              border-radius: 6px;
              margin-bottom: 15px;
            }
            
            .project-id strong {
              display: block;
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 3px;
            }
            
            .project-id span {
              font-size: 16px;
              color: #10b981;
              font-weight: bold;
            }
            
            .qr-instructions {
              text-align: center;
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 15px;
              line-height: 1.5;
            }
            
            .qr-contact {
              border-top: 1px solid #e5e7eb;
              padding-top: 15px;
              font-size: 10px;
              color: #6b7280;
              text-align: center;
            }
            
            .qr-contact strong {
              display: block;
              color: #1f2937;
              margin-bottom: 8px;
              font-size: 11px;
            }
            
            .qr-contact p {
              margin: 3px 0;
            }
            
            @media print {
              body {
                padding: 0;
              }
              
              .qr-print-card {
                border: 2px solid #10b981;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="qr-modal-header">
          <h2>Código QR del Proyecto</h2>
          <button className="qr-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="qr-modal-body">
          <div ref={printRef} className="qr-print-card">
            <div className="qr-header">
              <div className="qr-logo">GHP</div>
              <h1>Green House Project</h1>
              <p>Historial de Soporte Técnico</p>
            </div>

            <div className="qr-code-container">
              <QRCodeSVG
                value={historyUrl}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="project-id">
              <strong>ID DEL PROYECTO</strong>
              <span>{projectId}</span>
            </div>

            <div className="qr-instructions">
              📱 Escanea este código QR con tu celular para acceder al historial completo de tickets, información del sistema solar y crear nuevos reportes de soporte.
            </div>

            <div className="qr-contact">
              <strong>📞 Soporte Técnico 24/7</strong>
              <p>WhatsApp: +57 322 746 9557</p>
              <p>Teléfono: +57 300 975 4614</p>
              <p>Email: soporte@greenhproject.com</p>
            </div>
          </div>

          <div className="qr-modal-actions">
            <button className="btn-secondary" onClick={onClose}>
              Cerrar
            </button>
            <button className="btn-primary" onClick={handlePrint}>
              🖨️ Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;

