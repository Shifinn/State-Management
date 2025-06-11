import { Component, Input } from '@angular/core';
import { InputBoxComponent } from '../input-box/input-box.component';
import { TimePeriod } from '../../model/format.type';

@Component({
  selector: 'app-question',
  imports: [InputBoxComponent],
  templateUrl: './question.component.html',
  styleUrl: './question.component.css'
})
export class QuestionComponent {
  period_type = ['Year', 'Quarter', 'Month', 'Week'];
  @Input() data !: Array<TimePeriod>


  selectedValues: { [key: string]: string } = {};
  activeDropdown: string | null = null;

  itemsPerPage = 3;
  pageIndexes: { [key: string]: number } = {};

  ngOnInit() {
    for (const type of this.period_type) {
      const total = this.dropdownData[type]?.length || 1;
      const lastPage = Math.floor((total - 1) / this.itemsPerPage);
      this.pageIndexes[type] = lastPage;
    }
  }

  clickPeriodType(type: string) {
    console.log('Selected type:', type);
  }

  toggleDropdown(type: string) {
    this.activeDropdown = this.activeDropdown === type ? null : type;
  }

  getCurrentPage(type: string) {
    return this.pageIndexes[type] ?? 0;
  }

  getTotalPages(type: string): number {
    return Math.ceil((this.dropdownData[type]?.length || 0) / this.itemsPerPage);
  }

  getPageItems(type: string) {
    const page = this.getCurrentPage(type);
    const start = page * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.dropdownData[type].slice(start, end);
  }

  prevPage(type: string) {
    if (this.pageIndexes[type] > 0) {
      this.pageIndexes[type]--;
    }
  }

  nextPage(type: string) {
    if (this.pageIndexes[type] < this.getTotalPages(type) - 1) {
      this.pageIndexes[type]++;
    }
  }

  selectLabel(type: string, label: { label: string; value: string }) {
    this.selectedValues[type] = label.value;
    this.activeDropdown = null;
    console.log(`${type} set to`, label.value);
  }

}
