import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';

export type ButtonVariant = 'solid' | 'outline' | 'ghost';
export type ButtonColor = 'primary' | 'secondary' | 'neutral' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'combo-button',
  imports: [CommonModule, AngularSvgIconModule, RouterLink],
  templateUrl: './combo-button.html',
  styleUrl: './combo-button.scss',
})
export class ComboButton implements OnChanges {
  @Input() isIconOnly = false;
  @Input() variant: ButtonVariant = 'solid';
  @Input() color: ButtonColor = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() loading = false;
  @Input() disabled = false;
  @Input() leadIcon?: string;
  @Input() trailIcon?: string;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() fullWidth = false;
  @Input() link: string | any[] | null = null;
  @Input() target = '_self';
  @Input() customTextColor?: string;
  @Input() customFontSize?: string;
  @Input() customIconColor?: string;
  @Input() customIconSize?: string;
  @Input() ariaLabel?: string;
  @Input() flipLtr = false;

  @Output() clicked = new EventEmitter<MouseEvent>();

  protected readonly _loading = signal(this.loading);
  protected readonly _disabled = signal(this.disabled);
  readonly isDisabled = computed(() => this._disabled() || this._loading());

  ngOnChanges(): void {
    this._loading.set(this.loading);
    this._disabled.set(this.disabled);
  }

  get isExternalLink(): boolean {
    if (Array.isArray(this.link)) {
      return false;
    }

    if (typeof this.link === 'string') {
      return (
        this.link.startsWith('http') ||
        this.link.startsWith('mailto:') ||
        this.link.startsWith('tel:')
      );
    }

    return false;
  }

  get buttonClasses(): string {
    const classes: string[] = ['combo-btn'];

    classes.push(`combo-btn--${this.variant}-${this.color}`);
    classes.push(`combo-btn--${this.size}`);

    if (this.isIconOnly) classes.push('combo-btn--icon-only');
    if (this.isDisabled()) classes.push('combo-btn--disabled');
    if (this._loading()) classes.push('combo-btn--loading');
    if (this.fullWidth) classes.push('combo-btn--full-width');

    return classes.join(' ');
  }

  get computedAriaLabel(): string | null {
    if (this.isIconOnly) {
      return this.ariaLabel || 'Icon button';
    }

    return null;
  }

  handleClick(event: MouseEvent): void {
    if (!this.isDisabled()) {
      this.clicked.emit(event);
    }
  }

  get svgIconStyle(): Record<string, string | number> | null {
    if (!this.customIconSize) return null;

    const sizeValue = this.customIconSize.trim();

    if (sizeValue.endsWith('px')) {
      const pxValue = Number.parseFloat(sizeValue);

      if (!Number.isNaN(pxValue)) {
        return { 'width.px': pxValue, 'height.px': pxValue };
      }
    }

    return { width: sizeValue, height: sizeValue };
  }
}
