import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, FileText } from 'lucide-react';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy';
}

export function PolicyModal({ isOpen, onClose, type }: PolicyModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white p-8 rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-y-auto text-slate-800 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-black flex items-center gap-3 text-blue-900">
                {type === 'terms' ? <FileText className="text-blue-600" /> : <Shield className="text-blue-600" />}
                {type === 'terms' ? 'Termos de Uso' : 'Política de Privacidade (LGPD)'}
              </h2>
              <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="border-t-4 border-blue-600 pt-6">
              {type === 'privacy' ? (
                <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                  <p><strong>1. Introdução</strong></p>
                  <p>No LucroNoVolante, levamos a sério a sua privacidade e os seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).</p>
                  <p><strong>2. Dados Coletados</strong></p>
                  <p>Coletamos apenas o estritamente necessário para o funcionamento do app: e-mail (via autenticação Google), dados de entradas financeiras (registrados por você), e informações de localização quando utilizadas.</p>
                  <p><strong>3. Finalidade</strong></p>
                  <p>Os dados são utilizados para oferecer as funcionalidades do app (gestão financeira, relatórios) e não são compartilhados com terceiros para fins de marketing sem sua autorização explícita.</p>
                  <p><strong>4. Seus Direitos</strong></p>
                  <p>A qualquer momento você pode solicitar o acesso, retificação ou exclusão de seus dados entrando em contato conosco.</p>
                  <p className="text-xs pt-4 border-t"><em>[Nota: Esta é uma política simplificada. Para aplicações reais onde dados sensíveis são processados ou compartilhados com terceiros, consulte um advogado para elaborar uma política completa.]</em></p>
                </div>
              ) : (
                <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
                  <p><strong>1. Aceitação</strong></p>
                  <p>Ao utilizar o LucroNoVolante, você concorda com estes termos.</p>
                  <p><strong>2. Uso Responsável</strong></p>
                  <p>O app é destinado à organização financeira pessoal de motoristas e você é responsável pela veracidade dos dados inseridos.</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={onClose}
              className="w-full mt-8 bg-blue-600 text-white rounded-xl py-3 font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              Fechar
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
