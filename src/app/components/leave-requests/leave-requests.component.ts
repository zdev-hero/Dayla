import { Component } from '@angular/core';

@Component({
  selector: 'app-leave-requests',
  imports: [],
  templateUrl: './leave-requests.component.html',
  styleUrl: './leave-requests.component.scss',
})
export class LeaveRequestsComponent {
  selectedRows: Set<number> = new Set();

  // Mock data pour l'exemple - vous pouvez remplacer par vos vraies données
  leaveRequests = [
    { id: 1, selected: false },
    { id: 2, selected: false },
    { id: 3, selected: false },
    { id: 4, selected: false },
    { id: 5, selected: false },
  ];

  // Gérer le clic sur les informations utilisateur
  onUserClick(index: number, event: Event): void {
    // Empêcher la propagation de l'événement si nécessaire
    event.preventDefault();

    // Trouver le checkbox correspondant dans la même ligne
    const row = (event.currentTarget as HTMLElement).closest('tr');
    const checkbox = row?.querySelector('.row-checkbox') as HTMLInputElement;

    if (checkbox) {
      // Inverser l'état du checkbox
      checkbox.checked = !checkbox.checked;

      // Déclencher la logique de sélection
      if (checkbox.checked) {
        this.selectedRows.add(index);
        row?.classList.add('selected');
      } else {
        this.selectedRows.delete(index);
        row?.classList.remove('selected');
      }

      this.updateSelectAllCheckbox();
    }
  }

  // Gérer la sélection d'une ligne individuelle
  onRowSelect(index: number, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const row = checkbox.closest('tr');

    if (checkbox.checked) {
      this.selectedRows.add(index);
      row?.classList.add('selected');
    } else {
      this.selectedRows.delete(index);
      row?.classList.remove('selected');
    }

    this.updateSelectAllCheckbox();
  }

  // Gérer la sélection/désélection de toutes les lignes
  onSelectAll(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const allCheckboxes = document.querySelectorAll(
      '.row-checkbox'
    ) as NodeListOf<HTMLInputElement>;
    const allRows = document.querySelectorAll('.table-row');

    if (checkbox.checked) {
      // Sélectionner toutes les lignes
      this.selectedRows.clear();
      allCheckboxes.forEach((cb, index) => {
        cb.checked = true;
        this.selectedRows.add(index);
        allRows[index]?.classList.add('selected');
      });
    } else {
      // Désélectionner toutes les lignes
      this.selectedRows.clear();
      allCheckboxes.forEach((cb, index) => {
        cb.checked = false;
        allRows[index]?.classList.remove('selected');
      });
    }
  }

  // Mettre à jour l'état du checkbox "Sélectionner tout"
  private updateSelectAllCheckbox(): void {
    const selectAllCheckbox = document.querySelector(
      '.select-all-checkbox'
    ) as HTMLInputElement;
    const totalRows = document.querySelectorAll('.row-checkbox').length;

    if (this.selectedRows.size === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if (this.selectedRows.size === totalRows) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    }
  }
}
