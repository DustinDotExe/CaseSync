import { useRef, useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Participant } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Download, Printer, FileText, Calendar, User, Hash, Target, Loader2, LayoutDashboard, Scale } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as htmlToImage from 'html-to-image';

export default function CourtReport({ participant }: { participant: Participant }) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the report.');
      return;
    }

    const content = reportRef.current?.innerHTML || '';
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(style => style.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <html>
        <head>
          <title>Case Plan - ${participant.name}</title>
          ${styles}
          <style>
            body { background: white !important; padding: 20px !important; }
            .no-print { display: none !important; }
            .max-w-\\[8\\.5in\\] { max-width: 100% !important; width: 100% !important; }
            @page { margin: 0.5in; }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${content}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);

    try {
      const element = reportRef.current;
      
      // Small delay to allow React state changes (hiding borders/shadows) to reflect in the DOM
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture the report as a canvas
      const canvas = await htmlToImage.toCanvas(element, {
        backgroundColor: '#ffffff',
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList.contains('no-print')) {
            return false;
          }
          return true;
        },
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Generate PDF
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      
      const x = (pageWidth - finalWidth) / 2;
      const y = 20;
      
      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      
      const fileName = `Case_Plan_${participant.name.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF Export Error:', error);
      // If oklch error persists, it's likely in the CSS parsing of html-to-image
      alert('PDF generation failed. This is often due to modern CSS features. Please use the "Print Report" button and select "Save as PDF" for the best results.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div ref={reportRef} data-report-container className="print:m-0 print:p-0">
        <Card className={`bg-white dark:bg-slate-900 max-w-5xl mx-auto overflow-visible print:max-w-[8.5in] print:shadow-none print:border-none ${exporting ? 'shadow-none border-none' : 'shadow-lg border-slate-200 dark:border-slate-800'}`}>
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-white dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{participant.name} / Case Plan</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Created on {new Date().toLocaleDateString()}</p>
            </div>
            <div className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-lg md:text-xl flex items-center gap-2">
              <Scale className="w-5 h-5" />
              CaseSync
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="px-6 md:px-10 py-1 space-y-4">
          {/* Participant Info */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2 items-center divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
            <div className="text-center py-2 sm:py-0">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Participant</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">{participant.name}</p>
            </div>
            <div className="text-center py-2 sm:py-0">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Current Phase</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">{participant.currentPhase}</p>
            </div>
            <div className="text-center py-2 sm:py-0">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Case Number</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">{participant.caseNumber}</p>
            </div>
          </section>

          {/* IRAS Domains */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Target Domains
            </h3>
            <div className="flex flex-wrap gap-2">
              {participant.irasDomains && participant.irasDomains.length > 0 ? (
                participant.irasDomains.map((domain, i) => (
                  <Badge key={i} variant="outline" className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 font-bold px-3 py-1">
                    {domain}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">No target domains selected.</p>
              )}
            </div>
          </section>

          <Separator className="bg-slate-100 dark:bg-slate-800" />
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Active SMART Goals
            </h3>
            <div className="space-y-3">
              {participant.goals.length > 0 ? (
                participant.goals.map((goal, i) => {
                  const isCompleted = (participant.completedGoals || []).includes(goal);
                  
                  const handleToggleGoal = async () => {
                    const currentCompleted = participant.completedGoals || [];
                    const newCompleted = isCompleted 
                      ? currentCompleted.filter(g => g !== goal)
                      : [...currentCompleted, goal];
                    
                    try {
                      await updateDoc(doc(db, 'participants', participant.id), {
                        completedGoals: newCompleted,
                        updatedAt: serverTimestamp()
                      });
                    } catch (err) {
                      console.error("Update Goal Completion Error:", err);
                    }
                  };

                  return (
                    <div key={i} className="flex items-center gap-3 pl-4 border-l-2 border-blue-200 dark:border-blue-900 py-1 group">
                      <Checkbox 
                        id={`goal-${i}`} 
                        checked={isCompleted}
                        onCheckedChange={handleToggleGoal}
                        className="w-4 h-4 no-print border-slate-300 dark:border-slate-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <Label 
                        htmlFor={`goal-${i}`}
                        className={`text-sm leading-relaxed cursor-pointer transition-colors ${isCompleted ? 'text-slate-400 dark:text-slate-600 line-through' : 'text-slate-700 dark:text-slate-300'}`}
                      >
                        {goal}
                      </Label>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">No specific goals recorded for this period.</p>
              )}
            </div>
          </section>

          <Separator className="bg-slate-100 dark:bg-slate-800" />

          {/* Notes Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Case Manager Observations
            </h3>
            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-100 dark:border-slate-800 min-h-[100px]">
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {participant.notes || "No observations recorded for this period."}
              </p>
            </div>
          </section>

          {/* Footer */}
          <div className="pt-12 border-t border-slate-100 dark:border-slate-800 mt-12">
            <div className="flex flex-col sm:flex-row justify-between items-end gap-8 mb-8">
              <div className="space-y-1 w-full sm:w-auto">
                <div className="w-full sm:w-48 border-b border-slate-400 dark:border-slate-600 h-8"></div>
                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Case Manager Signature</p>
              </div>
              <div className="space-y-1 w-full sm:w-auto">
                <div className="w-full sm:w-48 border-b border-slate-400 dark:border-slate-600 h-8"></div>
                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider text-left sm:text-right">Participant Signature</p>
              </div>
            </div>
            <div className="text-center pt-4 border-t border-slate-50 dark:border-slate-900">
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Report ID</p>
              <p className="text-[10px] font-mono text-slate-300 dark:text-slate-700">{participant.id.toUpperCase()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 no-print mt-8 max-w-5xl mx-auto">
        <Button 
          variant="outline" 
          onClick={handlePrint} 
          className="w-full sm:w-auto border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-200 font-semibold shadow-sm transition-all active:scale-[0.98]"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Report
        </Button>
        <Button 
          onClick={handleExportPDF} 
          disabled={exporting}
          className="w-full sm:w-auto bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-semibold shadow-md transition-all active:scale-[0.98] min-w-[140px]"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {exporting ? 'Generating...' : 'Export PDF'}
        </Button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { 
            background: white !important; 
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          @page {
            size: auto;
            margin: 0.5in;
          }
          .max-w-5xl {
            max-width: 8.5in !important;
          }
        }
      `}} />
    </div>
  );
}
