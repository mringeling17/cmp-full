export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	public: {
		Tables: {
			agencies: {
				Row: {
					id: string;
					name: string;
					address: string | null;
					city: string | null;
					state: string | null;
					country: string | null;
					postal_code: string | null;
					receives_credit_note: boolean;
					created_at: string;
				};
				Insert: {
					id?: string;
					name: string;
					address?: string | null;
					city?: string | null;
					state?: string | null;
					country?: string | null;
					postal_code?: string | null;
					receives_credit_note?: boolean;
					created_at?: string;
				};
				Update: {
					id?: string;
					name?: string;
					address?: string | null;
					city?: string | null;
					state?: string | null;
					country?: string | null;
					postal_code?: string | null;
					receives_credit_note?: boolean;
					created_at?: string;
				};
				Relationships: [];
			};
			agency_contacts: {
				Row: {
					id: string;
					agency_id: string | null;
					name: string;
					phone: string | null;
					mobile: string | null;
					email: string | null;
					position: string | null;
					is_primary: boolean | null;
					created_at: string | null;
				};
				Insert: {
					id?: string;
					agency_id?: string | null;
					name: string;
					phone?: string | null;
					mobile?: string | null;
					email?: string | null;
					position?: string | null;
					is_primary?: boolean | null;
					created_at?: string | null;
				};
				Update: {
					id?: string;
					agency_id?: string | null;
					name?: string;
					phone?: string | null;
					mobile?: string | null;
					email?: string | null;
					position?: string | null;
					is_primary?: boolean | null;
					created_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'agency_contacts_agency_id_fkey';
						columns: ['agency_id'];
						isOneToOne: false;
						referencedRelation: 'agencies';
						referencedColumns: ['id'];
					}
				];
			};
			client_contacts: {
				Row: {
					id: string;
					client_id: string | null;
					name: string;
					phone: string | null;
					mobile: string | null;
					email: string | null;
					position: string | null;
					is_primary: boolean | null;
					created_at: string | null;
				};
				Insert: {
					id?: string;
					client_id?: string | null;
					name: string;
					phone?: string | null;
					mobile?: string | null;
					email?: string | null;
					position?: string | null;
					is_primary?: boolean | null;
					created_at?: string | null;
				};
				Update: {
					id?: string;
					client_id?: string | null;
					name?: string;
					phone?: string | null;
					mobile?: string | null;
					email?: string | null;
					position?: string | null;
					is_primary?: boolean | null;
					created_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'client_contacts_client_id_fkey';
						columns: ['client_id'];
						isOneToOne: false;
						referencedRelation: 'clients';
						referencedColumns: ['id'];
					}
				];
			};
			client_emails: {
				Row: {
					id: string;
					client_id: string | null;
					email_id: string | null;
					created_at: string | null;
				};
				Insert: {
					id?: string;
					client_id?: string | null;
					email_id?: string | null;
					created_at?: string | null;
				};
				Update: {
					id?: string;
					client_id?: string | null;
					email_id?: string | null;
					created_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'client_emails_client_id_fkey';
						columns: ['client_id'];
						isOneToOne: false;
						referencedRelation: 'clients';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'client_emails_email_id_fkey';
						columns: ['email_id'];
						isOneToOne: false;
						referencedRelation: 'emails';
						referencedColumns: ['id'];
					}
				];
			};
			clients: {
				Row: {
					id: string;
					name: string;
					address: string | null;
					city: string | null;
					state: string | null;
					country: string | null;
					postal_code: string | null;
					agency_id: string | null;
					created_at: string | null;
				};
				Insert: {
					id?: string;
					name: string;
					address?: string | null;
					city?: string | null;
					state?: string | null;
					country?: string | null;
					postal_code?: string | null;
					agency_id?: string | null;
					created_at?: string | null;
				};
				Update: {
					id?: string;
					name?: string;
					address?: string | null;
					city?: string | null;
					state?: string | null;
					country?: string | null;
					postal_code?: string | null;
					agency_id?: string | null;
					created_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'clients_agency_id_fkey';
						columns: ['agency_id'];
						isOneToOne: false;
						referencedRelation: 'agencies';
						referencedColumns: ['id'];
					}
				];
			};
			countries: {
				Row: {
					id: string;
					name: string;
					code: string;
					currency: string;
					currency_symbol: string;
				};
				Insert: {
					id: string;
					name: string;
					code: string;
					currency: string;
					currency_symbol: string;
				};
				Update: {
					id?: string;
					name?: string;
					code?: string;
					currency?: string;
					currency_symbol?: string;
				};
				Relationships: [];
			};
			emails: {
				Row: {
					id: string;
					email: string;
					created_at: string | null;
				};
				Insert: {
					id?: string;
					email: string;
					created_at?: string | null;
				};
				Update: {
					id?: string;
					email?: string;
					created_at?: string | null;
				};
				Relationships: [];
			};
			files: {
				Row: {
					id: string;
					filename: string;
					storage_path: string;
					file_type: string;
					status: string;
					processed: boolean | null;
					processed_at: string | null;
					uploaded_at: string | null;
					client_id: string | null;
					invoice_number: string | null;
				};
				Insert: {
					id?: string;
					filename: string;
					storage_path: string;
					file_type: string;
					status?: string;
					processed?: boolean | null;
					processed_at?: string | null;
					uploaded_at?: string | null;
					client_id?: string | null;
					invoice_number?: string | null;
				};
				Update: {
					id?: string;
					filename?: string;
					storage_path?: string;
					file_type?: string;
					status?: string;
					processed?: boolean | null;
					processed_at?: string | null;
					uploaded_at?: string | null;
					client_id?: string | null;
					invoice_number?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'files_client_id_fkey';
						columns: ['client_id'];
						isOneToOne: false;
						referencedRelation: 'clients';
						referencedColumns: ['id'];
					}
				];
			};
			files_log: {
				Row: {
					id: string;
					path: string;
					status: string | null;
					message: string | null;
					created_at: string | null;
				};
				Insert: {
					id?: string;
					path: string;
					status?: string | null;
					message?: string | null;
					created_at?: string | null;
				};
				Update: {
					id?: string;
					path?: string;
					status?: string | null;
					message?: string | null;
					created_at?: string | null;
				};
				Relationships: [];
			};
			invoices: {
				Row: {
					id: string;
					invoice_number: string;
					invoice_date: string | null;
					gross_value: number | null;
					net_value: number | null;
					channel: string | null;
					agency: string | null;
					order_reference: string | null;
					client_id: string | null;
					country: string | null;
					created_at: string | null;
					credit_note: string | null;
					factura_interna: string | null;
					product: string | null;
					feed: string | null;
					campaign_number: string | null;
					commission_percent: number | null;
					commission_amount: number | null;
					sales_executive: string | null;
					system_source: string | null;
					spot_count: number | null;
					business_type: string | null;
					document_type: string | null;
					company_code: string | null;
					channel_by_feed: string | null;
					due_date: string | null;
					exhibition_month: string | null;
				};
				Insert: {
					id?: string;
					invoice_number: string;
					invoice_date?: string | null;
					gross_value?: number | null;
					net_value?: number | null;
					channel?: string | null;
					agency?: string | null;
					order_reference?: string | null;
					client_id?: string | null;
					country?: string | null;
					created_at?: string | null;
					credit_note?: string | null;
					factura_interna?: string | null;
					product?: string | null;
					feed?: string | null;
					campaign_number?: string | null;
					commission_percent?: number | null;
					commission_amount?: number | null;
					sales_executive?: string | null;
					system_source?: string | null;
					spot_count?: number | null;
					business_type?: string | null;
					document_type?: string | null;
					company_code?: string | null;
					channel_by_feed?: string | null;
					due_date?: string | null;
					exhibition_month?: string | null;
				};
				Update: {
					id?: string;
					invoice_number?: string;
					invoice_date?: string | null;
					gross_value?: number | null;
					net_value?: number | null;
					channel?: string | null;
					agency?: string | null;
					order_reference?: string | null;
					client_id?: string | null;
					country?: string | null;
					created_at?: string | null;
					credit_note?: string | null;
					factura_interna?: string | null;
					product?: string | null;
					feed?: string | null;
					campaign_number?: string | null;
					commission_percent?: number | null;
					commission_amount?: number | null;
					sales_executive?: string | null;
					system_source?: string | null;
					spot_count?: number | null;
					business_type?: string | null;
					document_type?: string | null;
					company_code?: string | null;
					channel_by_feed?: string | null;
					due_date?: string | null;
					exhibition_month?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'invoices_client_id_fkey';
						columns: ['client_id'];
						isOneToOne: false;
						referencedRelation: 'clients';
						referencedColumns: ['id'];
					}
				];
			};
			payment_details: {
				Row: {
					id: string;
					payment_id: string;
					invoice_id: string;
					amount: number;
					payment_type: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					payment_id: string;
					invoice_id: string;
					amount: number;
					payment_type?: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					payment_id?: string;
					invoice_id?: string;
					amount?: number;
					payment_type?: string;
					created_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'payment_details_invoice_id_fkey';
						columns: ['invoice_id'];
						isOneToOne: false;
						referencedRelation: 'invoices';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'payment_details_payment_id_fkey';
						columns: ['payment_id'];
						isOneToOne: false;
						referencedRelation: 'payments';
						referencedColumns: ['id'];
					}
				];
			};
			payments: {
				Row: {
					id: string;
					amount: number;
					payment_date: string;
					reference: string;
					country: string;
					notes: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					amount: number;
					payment_date: string;
					reference: string;
					country?: string;
					notes?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					amount?: number;
					payment_date?: string;
					reference?: string;
					country?: string;
					notes?: string | null;
					created_at?: string;
				};
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			handle_file_upload: {
				Args: {
					p_filename: string;
					p_file_type: string;
					p_storage_path: string;
					p_client_id?: string;
				};
				Returns: string;
			};
			soft_delete_file: {
				Args: { p_file_id: string };
				Returns: boolean;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
				DefaultSchema['Views'])
		? (DefaultSchema['Tables'] &
				DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;
