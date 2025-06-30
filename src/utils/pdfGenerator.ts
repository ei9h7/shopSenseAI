import jsPDF from 'jspdf'
import type { TechSheet } from '../types'

/**
 * PDF Generator for ShopSenseAI Tech Sheets
 * 
 * Creates professional, branded PDF documents with:
 * - Custom ShopSenseAI branding and colors
 * - Professional layout with headers and footers
 * - Safety warnings with icons
 * - Step-by-step instructions with numbering
 * - Tool and parts lists with checkboxes
 * - QR code for digital access (future enhancement)
 */

export class PDFGenerator {
  private doc: jsPDF
  private pageWidth: number
  private pageHeight: number
  private margin: number
  private currentY: number
  private primaryColor: string = '#db2777' // ShopSenseAI pink
  private secondaryColor: string = '#64748b'
  private accentColor: string = '#ec4899'

  constructor() {
    this.doc = new jsPDF('portrait', 'mm', 'a4')
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
    this.margin = 20
    this.currentY = this.margin
  }

  /**
   * Generates a complete branded PDF tech sheet
   */
  async generateTechSheetPDF(techSheet: TechSheet): Promise<void> {
    // Add header with branding
    this.addHeader(techSheet)
    
    // Add tech sheet content
    this.addTechSheetInfo(techSheet)
    this.addDescription(techSheet)
    this.addSafetyWarnings(techSheet)
    this.addToolsAndParts(techSheet)
    this.addInstructions(techSheet)
    this.addTips(techSheet)
    
    // Add footer
    this.addFooter()
    
    // Download the PDF
    const fileName = `${techSheet.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_tech_sheet.pdf`
    this.doc.save(fileName)
  }

  /**
   * Adds branded header with logo and company info
   */
  private addHeader(techSheet: TechSheet): void {
    // Background header bar
    this.doc.setFillColor(this.primaryColor)
    this.doc.rect(0, 0, this.pageWidth, 25, 'F')
    
    // ShopSenseAI logo area (text-based for now)
    this.doc.setTextColor(255, 255, 255)
    this.doc.setFontSize(20)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('🔧 ShopSenseAI', this.margin, 15)
    
    // Tagline
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('Instant quotes. Automated booking. More wrench time.', this.margin, 20)
    
    // Tech Sheet title
    this.doc.setTextColor(0, 0, 0)
    this.doc.setFontSize(18)
    this.doc.setFont('helvetica', 'bold')
    this.currentY = 35
    this.doc.text('TECHNICAL REPAIR GUIDE', this.margin, this.currentY)
    
    this.currentY += 10
  }

  /**
   * Adds tech sheet basic information
   */
  private addTechSheetInfo(techSheet: TechSheet): void {
    // Title box
    this.doc.setFillColor(248, 250, 252) // Light gray background
    this.doc.rect(this.margin, this.currentY, this.pageWidth - (this.margin * 2), 25, 'F')
    this.doc.setDrawColor(this.primaryColor)
    this.doc.rect(this.margin, this.currentY, this.pageWidth - (this.margin * 2), 25, 'S')
    
    // Title
    this.doc.setTextColor(0, 0, 0)
    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(techSheet.title, this.margin + 5, this.currentY + 8)
    
    // Info grid
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    
    const infoY = this.currentY + 15
    this.doc.text(`Generated: ${new Date(techSheet.created_at).toLocaleDateString()}`, this.margin + 5, infoY)
    this.doc.text(`Estimated Time: ${techSheet.estimated_time} hours`, this.margin + 70, infoY)
    
    // Difficulty badge
    const difficultyColor = this.getDifficultyColor(techSheet.difficulty)
    this.doc.setFillColor(difficultyColor.r, difficultyColor.g, difficultyColor.b)
    this.doc.rect(this.margin + 130, infoY - 5, 25, 8, 'F')
    this.doc.setTextColor(255, 255, 255)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(techSheet.difficulty, this.margin + 135, infoY)
    
    // AI/Manual badge
    this.doc.setFillColor(techSheet.generated_by === 'ai' ? 147 : 107, techSheet.generated_by === 'ai' ? 51 : 114, techSheet.generated_by === 'ai' ? 234 : 128)
    this.doc.rect(this.margin + 160, infoY - 5, 25, 8, 'F')
    this.doc.text(techSheet.generated_by === 'ai' ? 'AI' : 'Manual', this.margin + 165, infoY)
    
    this.currentY += 35
    this.doc.setTextColor(0, 0, 0)
  }

  /**
   * Adds job description section
   */
  private addDescription(techSheet: TechSheet): void {
    this.addSectionHeader('JOB DESCRIPTION')
    
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(11)
    
    // Split long descriptions into multiple lines
    const lines = this.doc.splitTextToSize(techSheet.description, this.pageWidth - (this.margin * 2) - 10)
    lines.forEach((line: string) => {
      this.doc.text(line, this.margin + 5, this.currentY)
      this.currentY += 5
    })
    
    this.currentY += 5
  }

  /**
   * Adds safety warnings with warning icons
   */
  private addSafetyWarnings(techSheet: TechSheet): void {
    if (techSheet.safety_warnings.length === 0) return
    
    this.addSectionHeader('⚠️ SAFETY WARNINGS', '#f59e0b')
    
    // Warning box
    this.doc.setFillColor(254, 252, 232) // Light yellow
    this.doc.setDrawColor(245, 158, 11) // Orange border
    this.doc.rect(this.margin, this.currentY, this.pageWidth - (this.margin * 2), techSheet.safety_warnings.length * 6 + 10, 'FD')
    
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(10)
    this.doc.setTextColor(180, 83, 9) // Dark orange text
    
    this.currentY += 8
    techSheet.safety_warnings.forEach((warning) => {
      this.doc.text('⚠️', this.margin + 5, this.currentY)
      const lines = this.doc.splitTextToSize(warning, this.pageWidth - (this.margin * 2) - 20)
      lines.forEach((line: string, index: number) => {
        this.doc.text(line, this.margin + 15, this.currentY + (index * 4))
      })
      this.currentY += Math.max(6, lines.length * 4)
    })
    
    this.currentY += 10
    this.doc.setTextColor(0, 0, 0)
  }

  /**
   * Adds tools and parts in a two-column layout
   */
  private addToolsAndParts(techSheet: TechSheet): void {
    const startY = this.currentY
    const columnWidth = (this.pageWidth - (this.margin * 2) - 10) / 2
    
    // Tools column
    this.addSectionHeader('🔧 TOOLS REQUIRED')
    const toolsStartY = this.currentY
    
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(10)
    
    techSheet.tools_required.forEach((tool) => {
      // Checkbox
      this.doc.rect(this.margin + 5, this.currentY - 3, 3, 3, 'S')
      this.doc.text(tool, this.margin + 12, this.currentY)
      this.currentY += 6
    })
    
    const toolsEndY = this.currentY
    
    // Parts column (right side)
    this.currentY = toolsStartY
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(12)
    this.doc.setTextColor(this.primaryColor)
    this.doc.text('🔩 PARTS NEEDED', this.margin + columnWidth + 10, this.currentY)
    this.currentY += 8
    
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(10)
    this.doc.setTextColor(0, 0, 0)
    
    techSheet.parts_needed.forEach((part) => {
      // Checkbox
      this.doc.rect(this.margin + columnWidth + 15, this.currentY - 3, 3, 3, 'S')
      this.doc.text(part, this.margin + columnWidth + 22, this.currentY)
      this.currentY += 6
    })
    
    // Set currentY to the bottom of both columns
    this.currentY = Math.max(toolsEndY, this.currentY) + 10
  }

  /**
   * Adds step-by-step instructions with numbered steps
   */
  private addInstructions(techSheet: TechSheet): void {
    this.addSectionHeader('📋 STEP-BY-STEP INSTRUCTIONS')
    
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(10)
    
    techSheet.step_by_step.forEach((step, index) => {
      // Check if we need a new page
      if (this.currentY > this.pageHeight - 40) {
        this.doc.addPage()
        this.currentY = this.margin
      }
      
      // Step number circle
      this.doc.setFillColor(this.primaryColor)
      this.doc.circle(this.margin + 8, this.currentY - 2, 4, 'F')
      this.doc.setTextColor(255, 255, 255)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setFontSize(9)
      this.doc.text((index + 1).toString(), this.margin + 6, this.currentY + 1)
      
      // Step text
      this.doc.setTextColor(0, 0, 0)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(10)
      
      const lines = this.doc.splitTextToSize(step, this.pageWidth - (this.margin * 2) - 20)
      lines.forEach((line: string, lineIndex: number) => {
        this.doc.text(line, this.margin + 18, this.currentY + (lineIndex * 4))
      })
      
      this.currentY += Math.max(8, lines.length * 4) + 3
    })
    
    this.currentY += 5
  }

  /**
   * Adds tips and best practices
   */
  private addTips(techSheet: TechSheet): void {
    if (techSheet.tips.length === 0) return
    
    this.addSectionHeader('💡 TIPS & BEST PRACTICES', '#3b82f6')
    
    // Tips box
    this.doc.setFillColor(239, 246, 255) // Light blue
    this.doc.setDrawColor(59, 130, 246) // Blue border
    this.doc.rect(this.margin, this.currentY, this.pageWidth - (this.margin * 2), techSheet.tips.length * 6 + 10, 'FD')
    
    this.doc.setFont('helvetica', 'normal')
    this.doc.setFontSize(10)
    this.doc.setTextColor(29, 78, 216) // Dark blue text
    
    this.currentY += 8
    techSheet.tips.forEach((tip) => {
      this.doc.text('💡', this.margin + 5, this.currentY)
      const lines = this.doc.splitTextToSize(tip, this.pageWidth - (this.margin * 2) - 20)
      lines.forEach((line: string, index: number) => {
        this.doc.text(line, this.margin + 15, this.currentY + (index * 4))
      })
      this.currentY += Math.max(6, lines.length * 4)
    })
    
    this.currentY += 10
    this.doc.setTextColor(0, 0, 0)
  }

  /**
   * Adds footer with branding and contact info
   */
  private addFooter(): void {
    const footerY = this.pageHeight - 20
    
    // Footer line
    this.doc.setDrawColor(this.primaryColor)
    this.doc.line(this.margin, footerY - 5, this.pageWidth - this.margin, footerY - 5)
    
    // Footer text
    this.doc.setTextColor(this.secondaryColor)
    this.doc.setFontSize(8)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('Generated by ShopSenseAI - Instant quotes. Automated booking. More wrench time.', this.margin, footerY)
    this.doc.text('Built with Bolt.new', this.pageWidth - this.margin - 30, footerY)
    
    // Page number
    this.doc.text(`Page ${this.doc.getCurrentPageInfo().pageNumber}`, this.pageWidth / 2 - 10, footerY)
  }

  /**
   * Adds a section header with styling
   */
  private addSectionHeader(title: string, color?: string): void {
    this.doc.setFont('helvetica', 'bold')
    this.doc.setFontSize(12)
    this.doc.setTextColor(color || this.primaryColor)
    this.doc.text(title, this.margin, this.currentY)
    this.currentY += 8
  }

  /**
   * Gets color values for difficulty levels
   */
  private getDifficultyColor(difficulty: string): { r: number; g: number; b: number } {
    switch (difficulty) {
      case 'Easy': return { r: 34, g: 197, b: 94 }   // Green
      case 'Medium': return { r: 234, g: 179, b: 8 } // Yellow
      case 'Hard': return { r: 239, g: 68, b: 68 }   // Red
      default: return { r: 107, g: 114, b: 128 }     // Gray
    }
  }
}

/**
 * Utility function to generate and download a branded PDF tech sheet
 */
export const generateTechSheetPDF = async (techSheet: TechSheet): Promise<void> => {
  const generator = new PDFGenerator()
  await generator.generateTechSheetPDF(techSheet)
}