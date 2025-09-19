import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  PLATFORM_ID,
  Inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Employee } from '../../models/employee.model';

@Component({
  selector: 'app-edit-employee-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-employee-modal.component.html',
  styleUrl: './edit-employee-modal.component.scss',
})
export class EditEmployeeModalComponent implements OnInit, OnDestroy {
  editForm: FormGroup;
  isSubmitting: boolean = false;
  employee: Employee;

  constructor(
    private formBuilder: FormBuilder,
    @Inject(PLATFORM_ID) private platformId: object,
    private dialogRef: MatDialogRef<EditEmployeeModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { employee: Employee }
  ) {
    this.employee = data.employee;
    this.editForm = this.createEditForm();
  }

  ngOnInit(): void {
    // Remplir le formulaire avec les données de l'employé
    if (this.employee) {
      this.editForm.patchValue({
        firstName: this.employee.firstName,
        lastName: this.employee.lastName,
        email: this.employee.email,
        position: this.employee.position,
        department: this.employee.department,
      });
    }
  }

  ngOnDestroy(): void {
    // MatDialog gère automatiquement le nettoyage
  }

  createEditForm(): FormGroup {
    return this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      position: ['', [Validators.required]],
      department: ['', [Validators.required]],
    });
  }

  closeModal(): void {
    this.dialogRef.close();
  }

  onSubmitEdit(): void {
    if (this.editForm.valid && this.employee) {
      this.isSubmitting = true;

      const updatedEmployee: Employee = {
        ...this.employee,
        firstName: this.editForm.value.firstName,
        lastName: this.editForm.value.lastName,
        email: this.editForm.value.email,
        position: this.editForm.value.position,
        department: this.editForm.value.department,
      };

      // Simulation d'une sauvegarde - remplacez par votre service réel
      setTimeout(() => {
        this.dialogRef.close(updatedEmployee);
      }, 1000);
    }
  }

  // Helper pour obtenir les erreurs du formulaire
  getFieldError(fieldName: string): string | null {
    const field = this.editForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) {
        return 'Ce champ est obligatoire';
      }
      if (field.errors['minlength']) {
        return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
      }
      if (field.errors['email']) {
        return 'Format email invalide';
      }
    }
    return null;
  }

  // Méthode pour gérer l'erreur de chargement d'image
  handleImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'assets/images/default-avatar.svg';
    }
  }

  // Empêcher la propagation des événements pour éviter la fermeture accidentelle
  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  // Méthode pour gérer les clics sur l'overlay (optionnelle pour MatDialog)
  onOverlayClick(event: Event): void {
    // MatDialog gère automatiquement les clics sur l'overlay
    event.preventDefault();
  }
}
