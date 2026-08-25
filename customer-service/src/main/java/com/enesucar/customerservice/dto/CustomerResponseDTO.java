package com.enesucar.customerservice.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerResponseDTO {

    private Long id;

    private String firstName;

    private String lastName;

    private String email;

    private String phone;
	
	private String customerType;
}
