import { Component, ElementRef, effect, forwardRef, input, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'combo-password-input',
  templateUrl: './combo-password-input.html',
  styleUrl: './combo-password-input.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ComboPasswordInput),
      multi: true,
    },
  ],
})
export class ComboPasswordInput implements ControlValueAccessor {
  readonly id = input.required<string>();
  readonly autocomplete = input('current-password');
  readonly placeholder = input('');

  readonly visible = signal(false);
  readonly value = signal('');
  readonly disabled = signal(false);

  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    effect(() => {
      const element = this.field()?.nativeElement;
      const next = this.value();

      if (element && element.value !== next) {
        element.value = next;
      }
    });
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    this.value.set(next);
    this.onChange(next);
  }

  markTouched(): void {
    this.onTouched();
  }

  toggleVisibility(): void {
    this.visible.update((current) => !current);
  }
}
