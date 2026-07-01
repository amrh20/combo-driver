import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'combo-bottom-sheet',
  templateUrl: './combo-bottom-sheet.html',
  styleUrl: './combo-bottom-sheet.scss',
})
export class ComboBottomSheet {
  @Input({ required: true }) open = false;
  @Input() title = '';
  @Input() ariaLabel = '';

  @Output() closed = new EventEmitter<void>();

  onBackdropClick(): void {
    this.closed.emit();
  }
}
