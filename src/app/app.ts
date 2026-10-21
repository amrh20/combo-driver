import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ComboToast } from './shared/components';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ComboToast],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
